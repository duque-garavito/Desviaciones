const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuración global de oracledb
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

let pool;

/**
 * Inicializar el Pool de Conexiones nativo de Oracle
 */
async function initPool() {
  if (pool) return pool;
  try {
    const connectString = `${process.env.DB_HOST}:${process.env.DB_PORT || 1521}/${process.env.DB_NAME}`;
    pool = await oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: connectString,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
      poolTimeout: 60
    });
    console.log('✅ Pool de conexiones nativo Oracle DB iniciado correctamente.');
    return pool;
  } catch (error) {
    console.error('❌ Error al iniciar Pool de Oracle DB:', error.message);
    throw error;
  }
}

/**
 * Ejecutar una consulta SQL directa de lectura o escritura
 * @param {string} sql Consulta SQL a ejecutar
 * @param {object|array} bindParams Parámetros de bind para la consulta
 * @param {object} options Opciones adicionales para oracledb
 * @returns {Promise<Array>} Array de objetos con el resultado
 */
async function execute(sql, bindParams = {}, options = {}) {
  if (!pool) await initPool();
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.execute(sql, bindParams, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...options
    });
    return result.rows || [];
  } catch (error) {
    console.error('❌ Error en consulta SQL:', error.message);
    throw error;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error('Error cerrando conexión:', e.message);
      }
    }
  }
}

/**
 * Obtener una conexión dedicada para operaciones con Transacciones (COMMIT/ROLLBACK)
 */
async function getConnection() {
  if (!pool) await initPool();
  return await pool.getConnection();
}

// Inicializar el pool al importar
initPool().catch(err => console.warn('Advertencia al iniciar pool inicial:', err.message));

module.exports = {
  execute,
  getConnection,
  initPool,
  oracledb
};
