const db = require('../config/db');

class InspectionModel {
  static toLowercaseKeys(obj) {
    if (!obj) return obj;
    const newObj = {};
    for (const key of Object.keys(obj)) {
      newObj[key.toLowerCase()] = obj[key];
    }
    return newObj;
  }

  // Obtener el formulario asignado a un inspector para hoy
  static async getAssignedFormForToday(codUsr, especie) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // 1. Obtener área asignada hoy
    const prog = await db.execute(`
      SELECT pd.COD_AS, a.DESCR as area_nombre, CASE WHEN pd.TURNO = 'TD  ' THEN 'Día' ELSE 'Noche' END as TURNO
      FROM PROGRAMACION_CALIDAD_DET pd
      JOIN AREAS_SUPERVISION a ON pd.COD_AS = a.COD_AS
      WHERE pd.COD_USR = :codUsr 
        AND TRUNC(pd.FEC_PROGRAM) = TO_DATE(:todayStr, 'YYYY-MM-DD')
    `, { codUsr, todayStr });

    if (prog.length === 0) return null;

    const progNormalized = prog.map(r => this.toLowercaseKeys(r));
    const { cod_as, area_nombre, turno } = progNormalized[0];

    // 2. Obtener formulario activo para esa área de supervisión y especie
    let formQuery = `
      SELECT DISTINCT rv.COD_RV, rv.COD_VERSION, mr.DESCR as nombre, mr.COD_REPORTE
      FROM REPORTES_VERSIONADO rv
      JOIN MAESTRO_REPORTES mr ON rv.COD_REPORTE = mr.COD_REPORTE
      JOIN PLANTILLA_CAUSA_DESVIACION pcd ON mr.COD_REPORTE = pcd.COD_REPORTE
      WHERE pcd.COD_AS = :COD_AS AND rv.FLAG_ESTADO IN ('1', 'A')
    `;
    const replacements = { COD_AS: cod_as };

    if (especie) {
      formQuery += ` AND (pcd.COD_ESPECI IS NULL OR TRIM(pcd.COD_ESPECI) = TRIM(:ESPECIE)) `;
      replacements.ESPECIE = especie;
    }

    formQuery += `
      ORDER BY rv.COD_VERSION DESC
      FETCH FIRST 1 ROWS ONLY
    `;

    const form = await db.execute(formQuery, replacements);

    if (form.length === 0) return { area: area_nombre, hasForm: false };

    const formNormalized = form.map(r => this.toLowercaseKeys(r));

    // 3. Obtener preguntas de ese formulario
    const fields = "mp.COD_PREGUNTA as id, mp.DESCR as texto, tc.DESCRIPCION as tipo, mp.TIPO_CAMPO as tipo_campo, NULL as umbral_alerta, 'N' as requiere_justif";

    const preguntas = await db.execute(`
      SELECT ${fields}
      FROM PREGUNTAS_VERSIONADO pv
      JOIN MAESTRO_PREGUNTAS mp ON pv.COD_PREGUNTA = mp.COD_PREGUNTA
      JOIN TIPO_CAMPO tc ON mp.TIPO_CAMPO = tc.TIPO_CAMPO
      WHERE pv.COD_RV = :codRv
    `, { codRv: formNormalized[0].cod_rv });

    const preguntasNormalized = preguntas.map(r => {
      const low = this.toLowercaseKeys(r);
      for (const k of Object.keys(low)) {
        if (typeof low[k] === 'string') low[k] = low[k].trim();
      }
      return low;
    });

    return {
      success: true,
      hasForm: true,
      area: area_nombre,
      cod_area: cod_as,
      turno: turno,
      formulario: formNormalized[0].nombre,
      cod_rv: formNormalized[0].cod_rv,
      cod_reporte: formNormalized[0].cod_reporte,
      version: formNormalized[0].cod_version,
      preguntas: preguntasNormalized
    };
  }

  // Guardar respuestas de una inspección
  static async saveInspection(cod_rv, nro_ref, cod_usr, respuestas, hora_inicio, hora_fin) {
    const conn = await db.getConnection();
    try {
      // 1. Insertar Cabecera y Artículo usando el Procedimiento Almacenado de Oracle
      const result = await conn.execute(
        `BEGIN 
           USP_INSERTA_REPORTE_RESPUESTAS(
             :ls_COD_RV, :ls_TIPO_REF, :ls_NRO_REF, :ls_COD_USR, 
             :ls_COD_REP_C, :ls_cod_art, :ls_tipo_art
           ); 
         END;`,
        {
          ls_COD_RV: cod_rv,
          ls_TIPO_REF: 'MP  ',
          ls_NRO_REF: nro_ref || 'DEFAULT',
          ls_COD_USR: cod_usr,
          ls_cod_art: nro_ref || 'DEFAULT',
          ls_tipo_art: 'MP  ',
          ls_COD_REP_C: { type: db.oracledb.DB_TYPE_VARCHAR, dir: db.oracledb.BIND_OUT, maxSize: 12 }
        }
      );

      const cod_rep_c = result.outBinds.ls_COD_REP_C;

      // 2. Insertar Detalle por Muestra / Pregunta
      for (let i = 0; i < respuestas.length; i++) {
        const r = respuestas[i];
        await conn.execute(
          `BEGIN
             USP_INSERTA_REPORTE_RESPUESTAS_DET(
               :ls_COD_REP_C, :ls_COD_PREGUNTA, :ls_COD_RV, 
               :ls_RESP_BLOB, :ls_RESP_TIPO_BLOB, :ls_RESP_CHAR, 
               :ln_RESP_NUMBER, :ls_RESP_VARCHAR, :ls_COD_USR
             );
           END;`,
          {
            ls_COD_REP_C: cod_rep_c,
            ls_COD_PREGUNTA: r.cod_pregunta,
            ls_COD_RV: cod_rv,
            ls_RESP_BLOB: { type: db.oracledb.DB_TYPE_BLOB, val: null },
            ls_RESP_TIPO_BLOB: { type: db.oracledb.DB_TYPE_VARCHAR, val: null },
            ls_RESP_CHAR: r.resp_char || null,
            ln_RESP_NUMBER: r.resp_number !== undefined && r.resp_number !== null ? Number(r.resp_number) : null,
            ls_RESP_VARCHAR: r.resp_varchar || null,
            ls_COD_USR: cod_usr
          }
        );



        // Causas de desviación si existen
        if (r.causas && Array.isArray(r.causas)) {
          for (const c of r.causas) {
            const codMcd = typeof c === 'object' ? c.cod_mcd : c;
            const codSubCat = typeof c === 'object' ? c.cod_sub_cat : null;

            await conn.execute(`
              INSERT INTO REPORTE_RESPUESTAS_DET_CAUSAS (COD_REP_C, ITEM, COD_MCD, COD_SUB_CAT)
              VALUES (:cod_rep_c, :item, :codMcd, :codSubCat)
            `, {
              cod_rep_c,
              item: i + 1,
              codMcd,
              codSubCat: codSubCat || null
            });
          }
        }
      }

      // 3. Ejecutar procedimiento para actualizar el total de muestras con desviación en la relación de cabecera
      await conn.execute(
        `BEGIN
           USP_REPORTE_RESPUESTAS_DESVIACION_ARTICULO(:ls_COD_REP_C);
         END;`,
        {
          ls_COD_REP_C: cod_rep_c
        }
      );

      await conn.commit();
      return { success: true, cod_rep_c };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      if (conn) await conn.close();
    }
  }

  // Actualizar una inspección existente
  static async updateInspection(cod_rep_c, respuestas) {
    const conn = await db.getConnection();
    try {
      // 1. Limpiar causas asociadas anteriores
      await conn.execute(`DELETE FROM REPORTE_RESPUESTAS_DET_CAUSAS WHERE COD_REP_C = :cod_rep_c`, { cod_rep_c });

      // 2. Actualizar las respuestas de cada item
      for (let i = 0; i < respuestas.length; i++) {
        const r = respuestas[i];
        await conn.execute(`
          UPDATE REPORTE_RESPUESTAS_DET
          SET RESP_CHAR = :resp_char,
              RESP_NUMBER = :resp_number,
              RESP_VARCHAR = :resp_varchar
          WHERE COD_REP_C = :cod_rep_c AND ITEM = :item
        `, {
          resp_char: r.resp_char || null,
          resp_number: r.resp_number !== undefined && r.resp_number !== null ? Number(r.resp_number) : null,
          resp_varchar: r.resp_varchar || null,
          cod_rep_c,
          item: r.item || (i + 1)
        });

        // Insertar causas actualizadas si existen
        if (r.causas && Array.isArray(r.causas)) {
          for (const c of r.causas) {
            const codMcd = typeof c === 'object' ? c.cod_mcd : c;
            const codSubCat = typeof c === 'object' ? c.cod_sub_cat : null;

            await conn.execute(`
              INSERT INTO REPORTE_RESPUESTAS_DET_CAUSAS (COD_REP_C, ITEM, COD_MCD, COD_SUB_CAT)
              VALUES (:cod_rep_c, :item, :codMcd, :codSubCat)
            `, {
              cod_rep_c,
              item: r.item || (i + 1),
              codMcd,
              codSubCat: codSubCat || null
            });
          }
        }
      }

      await conn.commit();
      return { success: true, cod_rep_c };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      if (conn) await conn.close();
    }
  }

  // Buscar artículos por código, nombre, etiqueta o subcategoría (filtrados por el área del inspector)
  // Buscar artículos por código, nombre o etiqueta utilizando las consultas exactas del archivo garavito.sql:
  // - MP (Materia Prima, cod_clase='21') para Recepción (RECE)
  // - PPTT (Producto Terminado, cod_clase='01') para Empaque (EMPA)
  // - ARTICULO CONGELADO (ARTICULO_CONGE) para todas las demás áreas de proceso
  // Buscar artículos utilizando exactamente las consultas literales del archivo garavito.sql:
  // 1. MP (Materia Prima): Solo para Recepción (RECE)
  // 2. PPTT (Producto Terminado): Para Empaque (EMPA)
  // 3. ARTICULO CONGELADO | PROCESO: Para todas las demás áreas de proceso
  static async buscarArticulos(busqueda, subCat, codAs) {
    const areaNorm = (codAs || '').trim().toUpperCase();
    const txtBusqueda = (busqueda || '').trim();
    const replacements = {
      busqueda: txtBusqueda,
      codAs: (codAs || '').trim()
    };

    let query = '';

    if (areaNorm === 'RECE' || areaNorm === 'RECEPCION') {
      // --MP (Materia Prima, literal garavito.sql)
      query = `
        SELECT t.COD_ART,
               t.Desc_Art,
               t.DESC_ETIQUETA,
               t2.DESC_SUB_CAT,
               t.SUB_CAT_ART,
               es.especie
          FROM ARTICULO t
          JOIN ARTICULO_SUB_CATEG t2 ON t.SUB_CAT_ART = t2.COD_SUB_CAT
          inner join tg_especies es on t2.cat_art=es.cat_art
          inner join plantilla_causa_desviacion pc on t2.cod_sub_cat=pc.cod_sub_cat
         WHERE
           t.FLAG_ESTADO IN ('1', 'A')
           AND (
                 UPPER(t.COD_ART)       LIKE '%'|| UPPER(trim(:busqueda)) ||'%'
              OR UPPER(t.Desc_Art)  LIKE  '%'||UPPER(:busqueda) ||'%'
              OR UPPER(t.DESC_ETIQUETA) LIKE '%'||UPPER(:busqueda)||'%'
           )
           and pc.cod_as = :codAs
           and t.cod_clase='21'
         ORDER BY t.Desc_Art
         FETCH FIRST 20 ROWS ONLY
      `;
    } else if (areaNorm === 'EMPA' || areaNorm === 'EMPAQUE') {
      // --PPTT (Producto Terminado, literal garavito.sql)
      query = `
        SELECT t.COD_ART,
               t.Desc_Art,
               t.DESC_ETIQUETA,
               t2.DESC_SUB_CAT,
               t.SUB_CAT_ART,
               es.especie
          FROM ARTICULO t
          JOIN ARTICULO_SUB_CATEG t2 ON t.SUB_CAT_ART = t2.COD_SUB_CAT
          inner join tg_especies es on t2.cat_art=es.cat_art
          inner join plantilla_causa_desviacion pc on t2.cod_sub_cat=pc.cod_sub_cat
         WHERE
           t.FLAG_ESTADO IN ('1', 'A')
           AND (
                 UPPER(t.COD_ART)       LIKE '%'|| UPPER(trim(:busqueda)) ||'%'
              OR UPPER(t.Desc_Art)  LIKE  '%'||UPPER(:busqueda) ||'%'
              OR UPPER(t.DESC_ETIQUETA) LIKE '%'||UPPER(:busqueda)||'%'
           )
           and pc.cod_as = :codAs
           and t.cod_clase='01'
         ORDER BY t.Desc_Art
         FETCH FIRST 20 ROWS ONLY
      `;
    } else {
      // --ARTICULO CONGELADO | PROCESO (literal garavito.sql)
      query = `
        SELECT t.cod_art_cong,
               t.descr ,
               '' as DESC_ETIQUETA,
               t2.DESC_SUB_CAT,
               t.cod_subcat,
               es.especie
          FROM ARTICULO_CONGE t
          JOIN ARTICULO_SUB_CATEG t2 ON t.cod_subcat = t2.COD_SUB_CAT
          join articulo_categ t3 on t2.cat_art=t3.cat_art
          inner join tg_especies es on t3.cat_art=es.cat_art
          inner join plantilla_causa_desviacion pc on t2.cod_sub_cat=pc.cod_sub_cat
         WHERE (
                 UPPER(t.cod_art_cong)       LIKE '%'|| UPPER(trim(:busqueda)) ||'%'
              OR UPPER(t.descr)  LIKE  '%'||UPPER(:busqueda) ||'%'
            )
           and pc.cod_as = :codAs
         ORDER BY t.descr
         FETCH FIRST 20 ROWS ONLY
      `;
    }

    const rows = await db.execute(query, replacements);
    return rows.map(r => {
      const low = this.toLowercaseKeys(r);
      low.cod_art = low.cod_art || r.COD_ART || r.COD_ART_CONG || '';
      low.COD_ART = low.cod_art;

      low.nom_articulo = low.nom_articulo || r.NOM_ARTICULO || r.DESC_ART || r.DESCR || '';
      low.NOM_ARTICULO = low.nom_articulo;

      low.desc_sub_cat = low.desc_sub_cat || r.DESC_SUB_CAT || '';
      low.DESC_SUB_CAT = low.desc_sub_cat;

      low.desc_etiqueta = low.desc_etiqueta || r.DESC_ETIQUETA || '';
      low.DESC_ETIQUETA = low.desc_etiqueta;

      low.sub_cat_art = low.sub_cat_art || r.SUB_CAT_ART || r.COD_SUBCAT || '';
      low.SUB_CAT_ART = low.sub_cat_art;

      low.especie = low.especie || r.ESPECIE || '';
      low.ESPECIE = low.especie;

      return low;
    });
  }

  // Obtener causas de desviación filtradas por área y artículo
  static async getDeviationCauses(codReporte, codAs, codSubCat, codArt) {
    // 1. Consulta filtrada por artículo + área
    if (codArt && codArt.trim() !== '') {
      let areaWhere = '';
      const replacements = { codArt: String(codArt).trim() };

      if (codAs && codAs.trim() !== '') {
        areaWhere = ' AND pcd.COD_AS = :codAs ';
        replacements.codAs = String(codAs).trim();
      }

      const queryArticle = `
        SELECT MIN(mcd.COD_MCD) as COD_MCD,
               mcd.DESCR,
               MIN(cc.DESCR) as CATEGORIA,
               MIN(mcdf.COD_SUB_CAT) as COD_SUB_CAT
          FROM MAESTRO_CAUSAS_DESVIACION mcd
          JOIN CATEGORIA_CAUSA cc ON mcd.COD_CAT_CAUSA = cc.COD_CAT_CAUSA
          JOIN MAESTRO_CAUSAS_DESVIACION_FILTRO mcdf ON mcd.COD_MCD = mcdf.COD_MCD
          JOIN PLANTILLA_CAUSA_DESVIACION pcd ON TRIM(mcdf.COD_SUB_CAT) = TRIM(pcd.COD_SUB_CAT)
          JOIN ARTICULO a ON TRIM(mcdf.COD_SUB_CAT) = TRIM(a.SUB_CAT_ART)
         WHERE TRIM(a.COD_ART) = :codArt
           ${areaWhere}
         GROUP BY mcd.DESCR
         ORDER BY mcd.DESCR
      `;
      const causasArt = await db.execute(queryArticle, replacements);
      if (causasArt.length > 0) {
        return causasArt.map(r => this.toLowercaseKeys(r));
      }
    }

    // 2. Fallback: catálogo maestro completo de causas
    const queryDirect = `
      SELECT MIN(mcd.COD_MCD) as COD_MCD,
             mcd.DESCR,
             MIN(cc.DESCR) as CATEGORIA
        FROM MAESTRO_CAUSAS_DESVIACION mcd
        JOIN CATEGORIA_CAUSA cc ON mcd.COD_CAT_CAUSA = cc.COD_CAT_CAUSA
       GROUP BY mcd.DESCR
       ORDER BY mcd.DESCR
    `;

    const causas = await db.execute(queryDirect);
    return causas.map(r => this.toLowercaseKeys(r));
  }

  // Obtener motivos de desviación asociados a un artículo y área
  static async getDeviationsByArticle(codAs, codArt) {
    if (!codAs && !codArt) return [];

    let whereClause = " WHERE rv.FLAG_ESTADO IN ('1', 'A') ";
    const replacements = {};

    if (codAs && codAs.trim() !== '') {
      whereClause += " AND pcd.COD_AS = :codAs ";
      replacements.codAs = String(codAs).trim();
    }

    if (codArt && codArt.trim() !== '') {
      whereClause += " AND TRIM(a.COD_ART) = :codArt ";
      replacements.codArt = String(codArt).trim();
    }

    const query = `
      SELECT DISTINCT 
             mp.COD_PREGUNTA, 
             mp.DESCR as MOTIVO_DESVIACION
        FROM MAESTRO_PREGUNTAS mp
        JOIN PREGUNTAS_VERSIONADO pv ON mp.COD_PREGUNTA = pv.COD_PREGUNTA
        JOIN REPORTES_VERSIONADO rv ON pv.COD_RV = rv.COD_RV
        JOIN PLANTILLA_CAUSA_DESVIACION pcd ON rv.COD_REPORTE = pcd.COD_REPORTE
        JOIN ARTICULO a ON pcd.COD_SUB_CAT = a.SUB_CAT_ART
       ${whereClause}
       ORDER BY mp.DESCR
    `;

    const rows = await db.execute(query, replacements);
    return rows.map(r => this.toLowercaseKeys(r));
  }
}

module.exports = InspectionModel;
