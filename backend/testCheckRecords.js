const db = require('./config/db');

async function testRegistros() {
  try {
    console.log("=== ÚLTIMAS 5 CABECERAS REGISTRADAS ===");
    const res = await db.execute(`
      SELECT COD_REP_C, COD_RV, TIPO_REF, NRO_REF, COD_USR, 
             TO_CHAR(FEC_REGISTRO, 'DD/MM/YYYY HH24:MI:SS') as FECHA,
             PARTE_PRODUCCION
      FROM REPORTE_RESPUESTAS
      ORDER BY FEC_REGISTRO DESC
      FETCH FIRST 5 ROWS ONLY
    `);
    console.log(JSON.stringify(res, null, 2));

    if (res && res.length > 0) {
      const ultimoCod = res[0].COD_REP_C;
      console.log(`\n=== DETALLES DE MUESTRES DEL ÚLTIMO REPORTE (${ultimoCod}) ===`);
      const det = await db.execute(`
        SELECT COD_REP_C, ITEM, COD_PREGUNTA, RESP_CHAR, RESP_NUMBER, RESP_VARCHAR
        FROM REPORTE_RESPUESTAS_DET
        WHERE COD_REP_C = :ultimoCod
        ORDER BY ITEM
      `, { ultimoCod });
      console.log(JSON.stringify(det, null, 2));
    }
  } catch(e) {
    console.error("Error al consultar:", e.message);
  }
  process.exit(0);
}
testRegistros();
