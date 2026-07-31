const db = require('./config/db');

async function verificar() {
  const tablas = [
    'TIPO_CAMPO',
    'MAESTRO_PREGUNTAS',
    'PREGUNTAS_VERSIONADO',
    'AREA',
    'MAESTRO_REPORTES',
    'REPORTES_VERSIONADO',
    'REPORTE_RESPUESTAS',
    'REPORTE_RESPUESTAS_DET',
    'REPORTE_RESPUESTAS_DESVIACION_ARTICULO',
    'REPORTE_RESPUESTAS_DET_CAUSAS',
    'CATEGORIA_CAUSA',
    'MAESTRO_CAUSAS_DESVIACION',
    'MAESTRO_CAUSAS_DESVIACION_FILTRO',
    'PROGRAMACION_CALIDAD',
    'PROGRAMACION_CALIDAD_DET',
    'AREAS_SUPERVISION',
    'PLANTILLA_CAUSA_DESVIACION'
  ];

  try {
    for (const tabla of tablas) {
      // Columnas
      const cols = await db.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
        FROM ALL_TAB_COLUMNS
        WHERE TABLE_NAME = :t
        ORDER BY COLUMN_ID
      `, { t: tabla });

      // PKs
      const pks = await db.execute(`
        SELECT cols.COLUMN_NAME
        FROM ALL_CONSTRAINTS cons
        JOIN ALL_CONS_COLUMNS cols ON cons.CONSTRAINT_NAME = cols.CONSTRAINT_NAME
          AND cons.OWNER = cols.OWNER
        WHERE cons.CONSTRAINT_TYPE = 'P'
          AND cons.TABLE_NAME = :t
        ORDER BY cols.POSITION
      `, { t: tabla });

      console.log(`\n══ ${tabla} ══`);
      console.log('  PK:', pks.map(r => r.COLUMN_NAME).join(' + ') || '(ninguna)');
      cols.forEach(c => {
        const isPk = pks.some(p => p.COLUMN_NAME === c.COLUMN_NAME);
        console.log(`  ${isPk ? '#' : 'o'} ${c.COLUMN_NAME}  ${c.DATA_TYPE}(${c.DATA_LENGTH})  NULL:${c.NULLABLE}`);
      });
    }
  } catch(e) {
    console.error(e.message);
  }
  process.exit(0);
}
verificar();
