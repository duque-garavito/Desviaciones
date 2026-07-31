const db = require('./config/db');

async function testCurrentStatus() {
  try {
    console.log("=== VERIFICANDO BD ORACLE ===");
    const headers = await db.execute(`
      SELECT rr.COD_REP_C, rr.COD_RV, TRIM(rr.COD_USR) as COD_USR, 
             TO_CHAR(rr.FEC_REGISTRO, 'YYYY-MM-DD HH24:MI:SS') as FECHA,
             TRIM(rr.NRO_REF) as NRO_REF
      FROM REPORTE_RESPUESTAS rr
      ORDER BY rr.FEC_REGISTRO DESC
      FETCH FIRST 5 ROWS ONLY
    `);
    console.log("Headers:", JSON.stringify(headers, null, 2));

    if (headers && headers.length > 0) {
      const lastCod = headers[0].COD_REP_C;
      console.log(`\n=== DETALLES DEL ÚLTIMO COD_REP_C: ${lastCod} ===`);
      const details = await db.execute(`
        SELECT COD_REP_C, ITEM, COD_PREGUNTA, RESP_CHAR, RESP_NUMBER, RESP_VARCHAR
        FROM REPORTE_RESPUESTAS_DET
        WHERE COD_REP_C = :lastCod
      `, { lastCod });
      console.log("Details:", JSON.stringify(details, null, 2));
    }
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

testCurrentStatus();
