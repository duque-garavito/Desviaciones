const db = require('../config/db');

class ScheduleModel {
  static formatDateOnly(dateInput) {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Consultar programación semanal para un usuario específico (Inspector)
  static async getUserWeeklySchedule(codUsr, lunes) {
    const [year, month, day] = lunes.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day));
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6); // Cover Monday to Sunday

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const sql = `
      SELECT pd.COD_PRO, pd.FEC_PROGRAM, pd.TURNO, a.DESCR as AREA_DESCR
      FROM PROGRAMACION_CALIDAD_DET pd
      LEFT JOIN AREAS_SUPERVISION a ON pd.COD_AS = a.COD_AS
      WHERE pd.COD_USR = :codUsr
        AND TRUNC(pd.FEC_PROGRAM) >= TO_DATE(:startDateStr, 'YYYY-MM-DD')
        AND TRUNC(pd.FEC_PROGRAM) <= TO_DATE(:endDateStr, 'YYYY-MM-DD')
      ORDER BY pd.FEC_PROGRAM ASC, pd.COD_PRO ASC
    `;

    const rows = await db.execute(sql, { codUsr, startDateStr, endDateStr });

    // Remove duplicates by date, keeping only the latest assignment per day
    const uniqueMap = new Map();
    for (const d of rows) {
      console.log(d + "PROBANDO SQL");
      const fecha = ScheduleModel.formatDateOnly(d.FEC_PROGRAM);
      const areaNombre = d.AREA_DESCR || 'Sin área';
      const turnoNombre = (d.TURNO || '').trim() === 'TD' ? 'Día' : 'Noche';

      if (uniqueMap.has(fecha)) {
        const exist = uniqueMap.get(fecha);
        // Agregamos el área si aún no está en la lista de ese día
        if (!exist.area.includes(areaNombre)) {
          exist.area += ` / ${areaNombre}`;
          exist.area_nombre += ` / ${areaNombre}`;
        }
      } else {
        uniqueMap.set(fecha, {
          FECHA: fecha,
          TURNO: turnoNombre,
          area: areaNombre,
          area_nombre: areaNombre
        });
      }
    }


    return Array.from(uniqueMap.values());
  }
}

module.exports = ScheduleModel;
