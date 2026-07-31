const db = require('../config/db');

class RecordModel {
  static formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  static formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()} ${hours}:${minutes}:${seconds}`;
  }

  static toLowercaseKeys(obj) {
    if (!obj) return obj;
    const newObj = {};
    for (const key of Object.keys(obj)) {
      newObj[key.toLowerCase()] = obj[key];
    }
    return newObj;
  }

  // Obtener todos los registros de inspecciones con filtros opcionales
  static async getAll({ area, inspector, fechaInicio, fechaFin, page = 1, limit = 20 }) {
    let where = [];
    let replacements = {};

    if (area) {
      where.push('pcd.COD_AS = :area');
      replacements.area = area;
    }
    if (inspector) {
      where.push('rc.COD_USR = :inspector');
      replacements.inspector = inspector;
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const rows = await db.execute(`
      SELECT 
        rc.COD_REP_C as id,
        rc.COD_RV,
        rc.NRO_REF as lote,
        COALESCE(art.NOM_ARTICULO, artc.DESCR) as nom_articulo,
        rc.TIPO_REF as tipo_ref,
        rc.FEC_REGISTRO as fecha_raw,
        u.NOMBRE as inspector,
        u.COD_USR as cod_inspector,
        mr.DESCR as formulario,
        a.DESCR as area,
        rv.COD_VERSION as version,
        (SELECT COUNT(*) FROM REPORTE_RESPUESTAS_DET WHERE COD_REP_C = rc.COD_REP_C) as total_respuestas
      FROM REPORTE_RESPUESTAS rc
      JOIN REPORTES_VERSIONADO rv ON rc.COD_RV = rv.COD_RV
      JOIN MAESTRO_REPORTES mr ON rv.COD_REPORTE = mr.COD_REPORTE
      LEFT JOIN (
        SELECT DISTINCT COD_REPORTE, COD_AS FROM PLANTILLA_CAUSA_DESVIACION
      ) pcd ON mr.COD_REPORTE = pcd.COD_REPORTE
      LEFT JOIN AREAS_SUPERVISION a ON pcd.COD_AS = a.COD_AS
      LEFT JOIN USUARIO u ON rc.COD_USR = u.COD_USR
      LEFT JOIN ARTICULO art ON TRIM(rc.NRO_REF) = TRIM(art.COD_ART)
      LEFT JOIN ARTICULO_CONGE artc ON TRIM(rc.NRO_REF) = TRIM(artc.COD_ART_CONG)
      ${whereClause}
      ORDER BY rc.FEC_REGISTRO DESC
    `, replacements);

    const normalizedRows = rows.map(r => this.toLowercaseKeys(r));

    const formattedRows = normalizedRows.map(r => ({
      ...r,
      fecha: this.formatDate(r.fecha_raw),
      hora_inicio: this.formatDateTime(r.fecha_raw),
      hora_fin: this.formatDateTime(r.fecha_raw)
    }));

    let filteredRows = formattedRows;
    if (fechaInicio) {
      const startLimit = new Date(fechaInicio + 'T00:00:00');
      filteredRows = filteredRows.filter(r => {
        if (!r.fecha_raw) return false;
        return new Date(r.fecha_raw) >= startLimit;
      });
    }
    if (fechaFin) {
      const endLimit = new Date(fechaFin + 'T23:59:59');
      filteredRows = filteredRows.filter(r => {
        if (!r.fecha_raw) return false;
        return new Date(r.fecha_raw) <= endLimit;
      });
    }

    const getTimeMs = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val.getTime();
      const t = new Date(val).getTime();
      return isNaN(t) ? null : t;
    };

    const grupos = [];
    filteredRows.forEach(reg => {
      const grupoExistente = grupos.find(g => {
        const matchMeta = g.inspector === reg.inspector &&
                         g.formulario === reg.formulario &&
                         g.area === reg.area &&
                         g.fecha === reg.fecha;
        if (!matchMeta) return false;

        const t1 = getTimeMs(g.hora_fin_raw) || getTimeMs(g.hora_inicio_raw) || getTimeMs(g.fecha_raw);
        const t2 = getTimeMs(reg.hora_fin_raw) || getTimeMs(reg.hora_inicio_raw) || getTimeMs(reg.fecha_raw);

        if (t1 && t2) {
          return Math.abs(t1 - t2) <= 10 * 60000;
        }
        return true;
      });
      
      if (grupoExistente) {
        grupoExistente.ids.push(reg.id);
        grupoExistente.lotes.push(reg.lote || '—');
        grupoExistente.id = grupoExistente.ids.join(', ');
        grupoExistente.lote = grupoExistente.lotes.join(', ');
        grupoExistente.total_respuestas += reg.total_respuestas;
      } else {
        grupos.push({
          ...reg,
          ids: [reg.id],
          lotes: [reg.lote || '—'],
          id: reg.id,
          lote: reg.lote || '—',
          total_respuestas: reg.total_respuestas
        });
      }
    });

    const total = grupos.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRows = grupos.slice(offset, offset + parseInt(limit));

    return {
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      registros: paginatedRows
    };
  }

  // Obtener el detalle completo de una inspección específica
  static async getById(codRepC) {
    const header = await db.execute(`
      SELECT 
        rc.COD_REP_C as id,
        rc.COD_RV as cod_rv,
        mr.COD_REPORTE as cod_reporte,
        pcd.COD_AS as cod_area,
        rc.NRO_REF as lote,
        rc.TIPO_REF as tipo_ref,
        rc.FEC_REGISTRO as fecha_raw,
        u.NOMBRE as inspector,
        mr.DESCR as formulario,
        a.DESCR as area,
        rv.COD_VERSION as version
      FROM REPORTE_RESPUESTAS rc
      JOIN REPORTES_VERSIONADO rv ON rc.COD_RV = rv.COD_RV
      JOIN MAESTRO_REPORTES mr ON rv.COD_REPORTE = mr.COD_REPORTE
      LEFT JOIN (
        SELECT DISTINCT COD_REPORTE, COD_AS FROM PLANTILLA_CAUSA_DESVIACION
      ) pcd ON mr.COD_REPORTE = pcd.COD_REPORTE
      LEFT JOIN AREAS_SUPERVISION a ON pcd.COD_AS = a.COD_AS
      LEFT JOIN USUARIO u ON rc.COD_USR = u.COD_USR
      WHERE rc.COD_REP_C = :codRepC
      FETCH FIRST 1 ROWS ONLY
    `, { codRepC });

    if (header.length === 0) return null;

    const normalizedHeader = this.toLowercaseKeys(header[0]);

    let articuloInfo = { nom_articulo: '', desc_etiqueta: '', sub_cat_art: '' };
    const loteValue = (normalizedHeader.lote || '').trim();
    if (loteValue) {
      try {
        const artResult = await db.execute(`
          SELECT NOM_ARTICULO, DESC_ETIQUETA, SUB_CAT_ART
          FROM ARTICULO
          WHERE TRIM(COD_ART) = :lote
          FETCH FIRST 1 ROWS ONLY
        `, { lote: loteValue });
        if (artResult.length > 0) {
          const art = this.toLowercaseKeys(artResult[0]);
          articuloInfo = {
            nom_articulo: (art.nom_articulo || '').trim(),
            desc_etiqueta: (art.desc_etiqueta || '').trim(),
            sub_cat_art: (art.sub_cat_art || '').trim()
          };
        } else {
          // Buscar en ARTICULO_CONGE si no está en ARTICULO
          const artCongeResult = await db.execute(`
            SELECT DESCR as NOM_ARTICULO, '' as DESC_ETIQUETA, COD_SUBCAT as SUB_CAT_ART
            FROM ARTICULO_CONGE
            WHERE TRIM(COD_ART_CONG) = :lote
            FETCH FIRST 1 ROWS ONLY
          `, { lote: loteValue });
          if (artCongeResult.length > 0) {
            const artC = this.toLowercaseKeys(artCongeResult[0]);
            articuloInfo = {
              nom_articulo: (artC.nom_articulo || '').trim(),
              desc_etiqueta: '',
              sub_cat_art: (artC.sub_cat_art || '').trim()
            };
          }
        }
      } catch (err) {
        console.error('[getById] Error al buscar artículo:', err.message);
      }
    }

    const details = await db.execute(`
      SELECT 
        rd.ITEM,
        rd.RESP_CHAR,
        rd.RESP_NUMBER,
        rd.RESP_VARCHAR,
        rd.COD_PREGUNTA,
        mp.DESCR as pregunta,
        mp.TIPO_CAMPO as tipo_campo
      FROM REPORTE_RESPUESTAS_DET rd
      JOIN MAESTRO_PREGUNTAS mp ON rd.COD_PREGUNTA = mp.COD_PREGUNTA
      WHERE rd.COD_REP_C = :codRepC
      ORDER BY rd.ITEM ASC
    `, { codRepC });

    const normalizedDetails = details.map(d => this.toLowercaseKeys(d));

    const causasDet = await db.execute(`
      SELECT ITEM, COD_MCD as cod_mcd FROM REPORTE_RESPUESTAS_DET_CAUSAS WHERE COD_REP_C = :codRepC
    `, { codRepC });
    const normalizedCausas = causasDet.map(c => this.toLowercaseKeys(c));

    let cantMuestra = null;
    try {
      const cantRes = await db.execute(`
        SELECT CANT_MUESTRA
          FROM REPORTE_RESPUESTAS_DESVIACION_ARTICULO
         WHERE COD_REP_C = :codRepC
         FETCH FIRST 1 ROWS ONLY
      `, { codRepC });
      if (cantRes.length > 0) {
        const row = this.toLowercaseKeys(cantRes[0]);
        cantMuestra = row.cant_muestra !== null && row.cant_muestra !== undefined ? row.cant_muestra : null;
      }
    } catch (err) {
      console.error('[getById] Error leyendo CANT_MUESTRA:', err.message);
    }

    return {
      ...normalizedHeader,
      ...articuloInfo,
      cant_muestra: cantMuestra,
      fecha: this.formatDate(normalizedHeader.fecha_raw),
      hora_inicio: this.formatDateTime(normalizedHeader.fecha_raw),
      hora_fin: this.formatDateTime(normalizedHeader.fecha_raw),
      respuestas: normalizedDetails,
      causas: normalizedCausas
    };
  }

  // Obtener las áreas disponibles (para filtros)
  static async getAreas() {
    const rows = await db.execute(
      `SELECT COD_AS as COD_AREA, DESCR as DESCRIPCION 
       FROM AREAS_SUPERVISION 
       WHERE FLAG_ESTADO = 1`
    );
    return rows.map(r => ({
      COD_AREA: (r.COD_AREA || '').trim(),
      DESCRIPCION: (r.DESCRIPCION || '').trim()
    }));
  }
}

module.exports = RecordModel;
