const db = require('../config/db');

function decryptPassword(encrypted) {
  if (!encrypted) return "";
  const key = "SigreEsUnaFilosofiaDeVidaSigreEsUnaFilosofiaDeVida";
  const encryptedStr = String(encrypted).trim();
  const len = encryptedStr.length;
  const keyLen = key.length;

  let decrypted = "";
  let keyIndex = 0;

  for (let i = 0; i < len; i += 3) {
    const keyCharVal = key.charCodeAt(keyIndex);
    const chunk = encryptedStr.substring(i, i + 3);
    let code = parseInt(chunk, 10);
    if (isNaN(code)) continue;

    code -= keyCharVal;
    while (code < 0) {
      code += 255;
    }

    decrypted += String.fromCharCode(code);
    keyIndex = (keyIndex + 1) % keyLen;
  }

  return decrypted;
}

class UserModel {
  // Buscar usuario por código de usuario (COD_USR) y contraseña desencriptada (insensible a mayúsculas/minúsculas)
  static async findByCredentials(codUsr, password) {
    const query = `
      SELECT COD_USR, NOMBRE, EMAIL as CORREO, EMAIL as USUARIO, PERFIL, CLAVE
      FROM USUARIO
      WHERE LOWER(TRIM(COD_USR)) = LOWER(:codUsr)
    `;

    const results = await db.execute(query, { codUsr: String(codUsr || '').trim() });
    if (results.length === 0) return null;
    
    const user = results[0];

    // Desencriptar la contraseña de la BD y comparar
    const decryptedClave = decryptPassword(user.CLAVE);
    if (decryptedClave !== String(password).trim()) {
      return null;
    }

    delete user.CLAVE;
    return user;
  }

  // Obtener programación de un inspector para hoy
  static async getTodaySchedule(userId) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const results = await db.execute(`
      SELECT CASE WHEN pd.TURNO = 'TD  ' THEN 'DIA' ELSE 'NOCHE' END as TURNO, a.DESCR as AREA_NOMBRE
      FROM PROGRAMACION_CALIDAD_DET pd
      LEFT JOIN AREAS_SUPERVISION a ON pd.COD_AS = a.COD_AS
      WHERE LOWER(TRIM(pd.COD_USR)) = LOWER(:userId) AND TRUNC(pd.FEC_PROGRAM) = TO_DATE(:todayStr, 'YYYY-MM-DD')
    `, { userId: String(userId || '').trim(), todayStr });
    
    return results[0];
  }

  // Obtener lista de inspectores
  static async getAllInspectors() {
    const results = await db.execute(
      `SELECT COD_USR, COD_USR as id, NOMBRE, NOMBRE as nombre 
       FROM USUARIO 
       WHERE TRIM(PERFIL) = 'SUP_CALI'`
    );
    
    return results.map(r => {
      const newObj = {};
      for (const key of Object.keys(r)) {
        newObj[key.toLowerCase()] = typeof r[key] === 'string' ? r[key].trim() : r[key];
      }
      return newObj;
    });
  }
}

module.exports = UserModel;
