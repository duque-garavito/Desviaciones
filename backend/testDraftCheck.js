const db = require('./config/db');

async function testDraft() {
  try {
    const res = await db.execute(`
      SELECT TABLE_NAME FROM ALL_TABLES WHERE TABLE_NAME LIKE '%BORRADOR%' OR TABLE_NAME LIKE '%DRAFT%' OR TABLE_NAME LIKE '%TMP%' OR TABLE_NAME LIKE '%PRE%'
    `);
    console.log("Tablas relacionadas a borrador:", JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e.message);
  }
  process.exit(0);
}
testDraft();
