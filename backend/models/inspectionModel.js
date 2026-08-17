const db = require("../config/db");

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
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // 1. Obtener área asignada hoy
    const prog = await db.execute(
      `
      SELECT pd.COD_AS, a.DESCR as area_nombre, CASE WHEN pd.TURNO = 'TD  ' THEN 'Día' ELSE 'Noche' END as TURNO
      FROM PROGRAMACION_CALIDAD_DET pd
      JOIN AREAS_SUPERVISION a ON pd.COD_AS = a.COD_AS
      WHERE pd.COD_USR = :codUsr 
        AND TRUNC(pd.FEC_PROGRAM) = TO_DATE(:todayStr, 'YYYY-MM-DD')
    `,
      { codUsr, todayStr },
    );

    if (prog.length === 0) return null;

    const progNormalized = prog.map((r) => this.toLowercaseKeys(r));
    const { cod_as, area_nombre, turno } = progNormalized[0];

    // 2. Obtener formulario activo para esa área de supervisión y especie
    let formQuery = `
      SELECT  rv.COD_RV, rv.COD_VERSION, mr.DESCR as nombre, mr.COD_REPORTE
      FROM REPORTES_VERSIONADO rv
      JOIN MAESTRO_REPORTES mr ON rv.COD_REPORTE = mr.COD_REPORTE
      JOIN PLANTILLA_CAUSA_DESVIACION pcd ON mr.COD_REPORTE = pcd.COD_REPORTE
      join ARTICULO_SUB_CATEG ASUB ON PCD.COD_SUB_CAT=ASUB.COD_SUB_CAT
      JOIN TG_ESPECIES T ON ASUB.CAT_ART=T.CAT_ART
      WHERE pcd.COD_AS = :COD_AS AND rv.FLAG_ESTADO IN ('1', 'A')
    
    `;
    const replacements = { COD_AS: cod_as };

    if (especie) {
      formQuery += `  AND TRIM(T.ESPECIE) = TRIM(:ESPECIE)`;
      replacements.ESPECIE = especie;
    }

    formQuery += `
      ORDER BY rv.COD_VERSION DESC
      FETCH FIRST 1 ROWS ONLY
    `;

    const form = await db.execute(formQuery, replacements);

    if (form.length === 0) return { area: area_nombre, hasForm: false };

    const formNormalized = form.map((r) => this.toLowercaseKeys(r));

    // 3. Obtener preguntas de ese formulario
    const fields =
      "mp.COD_PREGUNTA as id, mp.DESCR as texto, tc.DESCRIPCION as tipo, mp.TIPO_CAMPO as tipo_campo, NULL as umbral_alerta, 'N' as requiere_justif";

    const preguntas = await db.execute(
      `
      SELECT ${fields}
      FROM PREGUNTAS_VERSIONADO pv
      JOIN MAESTRO_PREGUNTAS mp ON pv.COD_PREGUNTA = mp.COD_PREGUNTA
      JOIN TIPO_CAMPO tc ON mp.TIPO_CAMPO = tc.TIPO_CAMPO
      WHERE pv.COD_RV = :codRv
    `,
      { codRv: formNormalized[0].cod_rv },
    );

    const preguntasNormalized = preguntas.map((r) => {
      const low = this.toLowercaseKeys(r);
      for (const k of Object.keys(low)) {
        if (typeof low[k] === "string") low[k] = low[k].trim();
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
      preguntas: preguntasNormalized,
    };
  }

  // Guardar respuestas de una inspección
  static async saveInspection(
    cod_rv,
    nro_ref,
    cod_usr,
    respuestas,
    hora_inicio,
    hora_fin,
    conteo_muestra,
  ) {
    const conn = await db.getConnection();
    try {
      // Resolver TIPO_REF dinámicamente desde la tabla de origen del artículo
      let tipoRef = "MP  ";
      if (nro_ref && nro_ref.trim() !== "") {
        const artCode = String(nro_ref).trim();
        // Buscar primero en ARTICULO
        const artNormal = await conn.execute(
          `SELECT TRIM(COD_CLASE) as COD_CLASE FROM ARTICULO WHERE TRIM(COD_ART) = :artCode`,
          { artCode },
        );
        if (artNormal.rows && artNormal.rows.length > 0) {
          const codClase = artNormal.rows[0][0];
          if (codClase === "21")
            tipoRef = "MP  "; // Materia Prima
          else if (codClase === "01")
            tipoRef = "PPTT"; // Producto Terminado
          else tipoRef = "MP  ";
        } else {
          // Si no está en ARTICULO, buscar en ARTICULO_CONGE
          const artConge = await conn.execute(
            `SELECT TRIM(COD_ART_CONG) FROM ARTICULO_CONGE WHERE TRIM(COD_ART_CONG) = :artCode`,
            { artCode },
          );
          if (artConge.rows && artConge.rows.length > 0) {
            tipoRef = "CONG"; // Congelado / Proceso
          }
        }
      }

      // 1. Insertar Cabecera y Artículo usando el Procedimiento Almacenado de Oracle
      const result = await conn.execute(
        `BEGIN 
           USP_INSERTA_REPORTE_RESPUESTAS(
             :ls_COD_RV, :ls_TIPO_REF, :ls_NRO_REF, :ls_COD_USR, 
             :ls_COD_REP_C, :ls_cod_art, :ls_tipo_art, :ls_PARTE_PRODUCCION
           ); 
         END;`,
        {
          ls_COD_RV: cod_rv,
          ls_TIPO_REF: tipoRef,
          ls_NRO_REF: nro_ref || "DEFAULT",
          ls_COD_USR: cod_usr,
          ls_cod_art: nro_ref || "DEFAULT",
          ls_tipo_art: tipoRef,
          ls_PARTE_PRODUCCION: null,
          ls_COD_REP_C: {
            type: db.oracledb.DB_TYPE_VARCHAR,
            dir: db.oracledb.BIND_OUT,
            maxSize: 12,
          },
        },
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
               :ln_RESP_NUMBER, :ls_RESP_VARCHAR, :ls_COD_USR,
               :ls_COD_ART, :ls_TIPO_ART
             );
           END;`,
          {
            ls_COD_REP_C: cod_rep_c,
            ls_COD_PREGUNTA: r.cod_pregunta,
            ls_COD_RV: cod_rv,
            ls_RESP_BLOB: { type: db.oracledb.DB_TYPE_BLOB, val: null },
            ls_RESP_TIPO_BLOB: { type: db.oracledb.DB_TYPE_VARCHAR, val: null },
            ls_RESP_CHAR: r.resp_char || null,
            ln_RESP_NUMBER:
              r.resp_number !== undefined && r.resp_number !== null
                ? Number(r.resp_number)
                : null,
            ls_RESP_VARCHAR: r.resp_varchar || null,
            ls_COD_USR: cod_usr,
            ls_COD_ART: nro_ref || "DEFAULT",
            ls_TIPO_ART: tipoRef,
          },
        );

        // Causas de desviación si existen
        if (r.causas && Array.isArray(r.causas)) {
          for (const c of r.causas) {
            const codMcd = typeof c === "object" ? c.cod_mcd : c;
            const codSubCat = typeof c === "object" ? c.cod_sub_cat : null;

            await conn.execute(
              `
              INSERT INTO REPORTE_RESPUESTAS_DET_CAUSAS (COD_REP_C, ITEM, COD_MCD, COD_SUB_CAT)
              VALUES (:cod_rep_c, :item, :codMcd, :codSubCat)
            `,
              {
                cod_rep_c,
                item: i + 1,
                codMcd,
                codSubCat: codSubCat || null,
              },
            );
          }
        }
      }

      // 3. Ejecutar procedimiento para actualizar el total de muestras con desviación en la relación de cabecera
      await conn.execute(
        `BEGIN
           USP_REPORTE_RESPUESTAS_DESVIACION_ARTICULO(:ls_COD_REP_C, :ls_COD_ART);
         END;`,
        {
          ls_COD_REP_C: cod_rep_c,
          ls_COD_ART: nro_ref || "DEFAULT",
        },
      );

      // 4. Registrar la cantidad exacta de muestras evaluadas ingresada por el inspector
      if (conteo_muestra && !isNaN(parseInt(conteo_muestra))) {
        const cantVal = parseInt(conteo_muestra);
        await conn.execute(
          `UPDATE REPORTE_RESPUESTAS_DESVIACION_ARTICULO
              SET CANT_MUESTRA = :cantVal
            WHERE COD_REP_C = :cod_rep_c`,
          { cantVal, cod_rep_c },
        );
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

  // Crear cabecera de inspección al iniciar (y registrar datos de recepción y parte de producción)
  static async createHeader(
    area,
    articulo,
    nro_ref,
    cod_usr,
    parte_produccion,
  ) {
    const conn = await db.getConnection();
    try {
      /*  let tipoRef = 'MP  ';
      if (nro_ref && nro_ref.trim() !== '') {
        const artCode = String(nro_ref).trim();
        const artNormal = await conn.execute(
          `SELECT TRIM(COD_CLASE) as COD_CLASE FROM ARTICULO WHERE TRIM(COD_ART) = :artCode`,
          { artCode }
        );
        if (artNormal.rows && artNormal.rows.length > 0) {
          const codClase = artNormal.rows[0][0];
          if (codClase === '21') tipoRef = 'MP  ';
          else if (codClase === '01') tipoRef = 'PPTT';
          else tipoRef = 'MP  ';
        } else {
          const artConge = await conn.execute(
            `SELECT TRIM(COD_ART_CONG) FROM ARTICULO_CONGE WHERE TRIM(COD_ART_CONG) = :artCode`,
            { artCode }
          );
          if (artConge.rows && artConge.rows.length > 0) {
            tipoRef = 'CONG';
          }
        }
      } */

      // 1. Insertar Cabecera
      const result = await conn.execute(
        `BEGIN 
           USP_INSERTA_REPORTE_RESPUESTAS(
             :ls_AREA, :ls_TIPO_REF, :ls_NRO_REF, :ls_COD_USR, 
             :ls_COD_REP_C, :ls_cod_art, :ls_tipo_art, :ls_PARTE_PRODUCCION
           ); 
         END;`,
        {
          ls_AREA: area,
          ls_TIPO_REF: "DESV",
          ls_NRO_REF: nro_ref || "",
          ls_COD_USR: cod_usr,
          ls_cod_art: articulo || "",
          ls_tipo_art:
            area === "RECE" ? "MP" : area === "EMPA" ? "PPTT" : "CONG",
          ls_PARTE_PRODUCCION: parte_produccion
            ? String(parte_produccion).trim()
            : null,
          ls_COD_REP_C: {
            type: db.oracledb.DB_TYPE_VARCHAR,
            dir: db.oracledb.BIND_OUT,
            maxSize: 12,
          },
        },
      );

      const cod_rep_c = result.outBinds.ls_COD_REP_C;

      // 1b. Si se ingresó Parte de Producción, actualizarlo en la cabecera creada
      /*  if (parte_produccion && String(parte_produccion).trim() !== "") {
        await conn.execute(
          `UPDATE REPORTE_RESPUESTAS SET PARTE_PRODUCCION = :parte WHERE COD_REP_C = :cod_rep_c`,
          { parte: String(parte_produccion).trim(), cod_rep_c },
        );
      } */

      // 2. Si vienen campos de texto (ej. Recepción: Procedencia, Cámara, Proveedor), registrarlos
      /* if (camposTexto && Array.isArray(camposTexto)) {
        for (const ct of camposTexto) {
          await conn.execute(
            `BEGIN
               USP_INSERTA_REPORTE_RESPUESTAS_DET(
                 :ls_COD_REP_C, :ls_COD_PREGUNTA, :ls_COD_RV, 
                 :ls_RESP_BLOB, :ls_RESP_TIPO_BLOB, :ls_RESP_CHAR, 
                 :ln_RESP_NUMBER, :ls_RESP_VARCHAR, :ls_COD_USR,
                 :ls_COD_ART, :ls_TIPO_ART
               );
             END;`,
            {
              ls_COD_REP_C: cod_rep_c,
              ls_COD_PREGUNTA: ct.cod_pregunta,
              ls_COD_RV: cod_rv,
              ls_RESP_BLOB: { type: db.oracledb.DB_TYPE_BLOB, val: null },
              ls_RESP_TIPO_BLOB: {
                type: db.oracledb.DB_TYPE_VARCHAR,
                val: null,
              },
              ls_RESP_CHAR: null,
              ln_RESP_NUMBER: null,
              ls_RESP_VARCHAR: ct.resp_varchar || null,
              ls_COD_USR: cod_usr,
              ls_COD_ART: nro_ref || "DEFAULT",
              ls_TIPO_ART:
                area === "RECE" ? "MP" : area === "EMPA" ? "PPTT" : "CONG",
            },
          );
        }
      } */

      await conn.commit();
      return { success: true, cod_rep_c };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      if (conn) await conn.close();
    }
  }

  // Guardar/Actualizar progreso incremental de muestras en BD de Oracle
  static async syncProgress(
    cod_rep_c,
    cod_rv,
    cod_usr,
    // respuesta,
    cod_art,
    tipo_art,
    sub_cat,
    causa,
    respuestas,
  ) {
    const conn = await db.getConnection();
    try {
      /* // Obtener el artículo (NRO_REF) y TIPO_REF real de la cabecera
      let codArt = nro_ref_param || "DEFAULT";
      let tipoArt = "MP  ";
      const resHeader = await conn.execute(
        `SELECT TRIM(NRO_REF) as NRO_REF, TIPO_REF FROM REPORTE_RESPUESTAS WHERE COD_REP_C = :cod_rep_c`,
        { cod_rep_c },
      );
      if (resHeader.rows && resHeader.rows.length > 0) {
        if (resHeader.rows[0][0]) codArt = resHeader.rows[0][0];
        if (resHeader.rows[0][1]) tipoArt = resHeader.rows[0][1];
      } */

      // 1. Limpiar causas y respuestas numéricas anteriores de este reporte para sobreescribir el avance
      /*  await conn.execute(
        `DELETE FROM REPORTE_RESPUESTAS_DET_CAUSAS WHERE COD_REP_C = :cod_rep_c`,
        { cod_rep_c },
      ); */

      // Limpiar detalles de preguntas N (muestreo) manteniendo los de tipo V si ya se registraron
      /*  await conn.execute(
        `
        DELETE FROM REPORTE_RESPUESTAS_DET 
        WHERE COD_REP_C = :cod_rep_c 
          AND COD_PREGUNTA IN (
            SELECT COD_PREGUNTA FROM MAESTRO_PREGUNTAS WHERE TIPO_CAMPO != 'V'
          )
      `,
        { cod_rep_c },
      ); */

      // 2. Re-insertar respuestas actualizadas del muestreo

      for (let i = 0; i < respuestas.length; i++) {
        const respuesta = respuestas[i];

        await conn.execute(
          `BEGIN
             USP_INSERTA_REPORTE_RESPUESTAS_DET(
               :ls_COD_REP_C, :ls_COD_PREGUNTA, :ls_COD_RV, 
               :ls_RESP_BLOB, :ls_RESP_TIPO_BLOB, :ls_RESP_CHAR, 
               :ln_RESP_NUMBER, :ls_RESP_VARCHAR, :ls_COD_USR,
               :ls_COD_ART, :ls_TIPO_ART,:ls_sub_cat,:ls_causa
             );
           END;`,
          {
            ls_COD_REP_C: cod_rep_c,
            ls_COD_PREGUNTA: respuesta.cod_pregunta,
            ls_COD_RV: cod_rv,
            ls_RESP_BLOB: { type: db.oracledb.DB_TYPE_BLOB, val: null },
            ls_RESP_TIPO_BLOB: {
              type: db.oracledb.DB_TYPE_VARCHAR,
              val: null,
            },
            ls_RESP_CHAR: respuesta.resp_char || null,
            ln_RESP_NUMBER:
              respuesta.resp_number !== undefined &&
              respuesta.resp_number !== null
                ? Number(respuesta.resp_number)
                : null,
            ls_RESP_VARCHAR: respuesta.resp_varchar || null,
            ls_COD_USR: cod_usr,
            ls_COD_ART: cod_art,
            ls_TIPO_ART: tipo_art,
            ls_sub_cat: sub_cat,
            ls_causa: causa,
          },
        );

        // 3. Actualizar desvíos por artículo
      }

      /* if (r.causas && Array.isArray(r.causas)) {
          for (const c of r.causas) {
            const codMcd = typeof c === "object" ? c.cod_mcd : c;
            const codSubCat = typeof c === "object" ? c.cod_sub_cat : null;

            await conn.execute(
              `
              INSERT INTO REPORTE_RESPUESTAS_DET_CAUSAS (COD_REP_C, ITEM, COD_MCD, COD_SUB_CAT)
              VALUES (:cod_rep_c, :item, :codMcd, :codSubCat)
            `,
              {
                cod_rep_c,
                item: i + 1,
                codMcd,
                codSubCat: codSubCat || null,
              },
            );
          }
        } */

      /*   if (conteo_muestra && !isNaN(parseInt(conteo_muestra))) {
        const cantVal = parseInt(conteo_muestra);
        await conn.execute(
          `UPDATE REPORTE_RESPUESTAS_DESVIACION_ARTICULO
              SET CANT_MUESTRA = :cantVal
            WHERE COD_REP_C = :cod_rep_c`,
          { cantVal, cod_rep_c },
        );
      } */

      await conn.commit();
      return { success: true /* , cod_rep_c */ };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      if (conn) await conn.close();
    }
  }

  // Consultar en Oracle si el inspector tiene una inspección iniciada hoy
  static async getActiveDraftForToday(cod_usr) {
    const conn = await db.getConnection();
    try {
      const resHeader = await conn.execute(
        `
        SELECT rr.COD_REP_C, rr.COD_RV, rr.TIPO_REF, TRIM(rr.NRO_REF) as NRO_REF
        FROM REPORTE_RESPUESTAS rr
        WHERE TRIM(rr.COD_USR) = :cod_usr
          AND rr.FEC_REGISTRO >= SYSDATE - 2
        ORDER BY rr.FEC_REGISTRO DESC
        FETCH FIRST 1 ROWS ONLY
      `,
        { cod_usr: String(cod_usr).trim() },
      );

      if (!resHeader.rows || resHeader.rows.length === 0) {
        return null;
      }

      const row = resHeader.rows[0];
      const cod_rep_c = row[0];
      const cod_rv = row[1];
      const nro_ref = row[3];

      // Buscar detalles de respuestas en BD si existen
      const resDet = await conn.execute(
        `
        SELECT rrd.ITEM, rrd.COD_PREGUNTA, rrd.RESP_CHAR, rrd.RESP_NUMBER, rrd.RESP_VARCHAR
        FROM REPORTE_RESPUESTAS_DET rrd
        WHERE rrd.COD_REP_C = :cod_rep_c
        ORDER BY rrd.ITEM ASC
      `,
        { cod_rep_c },
      );

      const respuestas = resDet.rows || [];

      // Buscar info del artículo
      let articulo = { COD_ART: nro_ref };
      const artNormal = await conn.execute(
        `SELECT TRIM(COD_ART) as COD_ART, NOM_ARTICULO FROM ARTICULO WHERE TRIM(COD_ART) = :nro_ref`,
        { nro_ref },
      );
      if (artNormal.rows && artNormal.rows.length > 0) {
        articulo = {
          COD_ART: artNormal.rows[0][0],
          NOM_ARTICULO: artNormal.rows[0][1],
        };
      } else {
        const artConge = await conn.execute(
          `SELECT TRIM(COD_ART_CONG) as COD_ART, DESCR as NOM_ARTICULO FROM ARTICULO_CONGE WHERE TRIM(COD_ART_CONG) = :nro_ref`,
          { nro_ref },
        );
        if (artConge.rows && artConge.rows.length > 0) {
          articulo = {
            COD_ART: artConge.rows[0][0],
            NOM_ARTICULO: artConge.rows[0][1],
          };
        }
      }

      // Buscar causas asociadas
      const resCausas = await conn.execute(
        `
        SELECT rrdc.ITEM, rrdc.COD_MCD, mcd.DESCR as DESCR_CAUSA, rrdc.COD_SUB_CAT
        FROM REPORTE_RESPUESTAS_DET_CAUSAS rrdc
        LEFT JOIN MAESTRO_CAUSAS_DESVIACION mcd ON rrdc.COD_MCD = mcd.COD_MCD
        WHERE rrdc.COD_REP_C = :cod_rep_c
      `,
        { cod_rep_c },
      );

      return {
        cod_rep_c,
        cod_rv,
        articulo,
        respuestas: respuestas.map((r) => ({
          item: r[0],
          cod_pregunta: r[1],
          resp_char: r[2],
          resp_number: r[3],
          resp_varchar: r[4],
        })),
        causas: (resCausas.rows || []).map((c) => ({
          item: c[0],
          cod_mcd: c[1],
          descr_causa: c[2],
          cod_sub_cat: c[3],
        })),
      };
    } catch (error) {
      console.error("Error obteniendo borrador activo de BD Oracle:", error);
      return null;
    } finally {
      if (conn) await conn.close();
    }
  }

  // Cancelar borrador (en caso de que el usuario descarte voluntariamente la inspección)
  static async cancelDraft(cod_rep_c) {
    const conn = await db.getConnection();
    try {
      await conn.execute(
        `DELETE FROM REPORTE_RESPUESTAS_DET_CAUSAS WHERE COD_REP_C = :cod_rep_c`,
        { cod_rep_c },
      );
      await conn.execute(
        `DELETE FROM REPORTE_RESPUESTAS_DESVIACION_ARTICULO WHERE COD_REP_C = :cod_rep_c`,
        { cod_rep_c },
      );
      await conn.execute(
        `DELETE FROM REPORTE_RESPUESTAS_DET WHERE COD_REP_C = :cod_rep_c`,
        { cod_rep_c },
      );
      await conn.execute(
        `DELETE FROM REPORTE_RESPUESTAS WHERE COD_REP_C = :cod_rep_c`,
        { cod_rep_c },
      );
      await conn.commit();
      return { success: true };
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
      await conn.execute(
        `DELETE FROM REPORTE_RESPUESTAS_DET_CAUSAS WHERE COD_REP_C = :cod_rep_c`,
        { cod_rep_c },
      );

      // 2. Actualizar las respuestas de cada item
      for (let i = 0; i < respuestas.length; i++) {
        const r = respuestas[i];
        await conn.execute(
          `
          UPDATE REPORTE_RESPUESTAS_DET
          SET RESP_CHAR = :resp_char,
              RESP_NUMBER = :resp_number,
              RESP_VARCHAR = :resp_varchar
          WHERE COD_REP_C = :cod_rep_c AND ITEM = :item
        `,
          {
            resp_char: r.resp_char || null,
            resp_number:
              r.resp_number !== undefined && r.resp_number !== null
                ? Number(r.resp_number)
                : null,
            resp_varchar: r.resp_varchar || null,
            cod_rep_c,
            item: r.item || i + 1,
          },
        );

        // Insertar causas actualizadas si existen
        if (r.causas && Array.isArray(r.causas)) {
          for (const c of r.causas) {
            const codMcd = typeof c === "object" ? c.cod_mcd : c;
            const codSubCat = typeof c === "object" ? c.cod_sub_cat : null;

            await conn.execute(
              `
              INSERT INTO REPORTE_RESPUESTAS_DET_CAUSAS (COD_REP_C, ITEM, COD_MCD, COD_SUB_CAT)
              VALUES (:cod_rep_c, :item, :codMcd, :codSubCat)
            `,
              {
                cod_rep_c,
                item: r.item || i + 1,
                codMcd,
                codSubCat: codSubCat || null,
              },
            );
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
  static async buscarArticulos(busqueda, subCat, codAs, parte) {
    const areaNorm = (codAs || "").trim().toUpperCase();
    const txtBusqueda = (busqueda || "").trim();

    console.log("=================================");
    console.log("🔴 ÁREA RECIBIDA:", codAs);
    console.log("🔴 ÁREA NORMALIZADA:", areaNorm);
    console.log("🔴 BUSQUEDA:", txtBusqueda);
    console.log("🔴 PARTE:", parte);
    console.log("=================================");
    const replacements = {
      busqueda: txtBusqueda,
      codAs: (codAs || "").trim(),
      parte: (parte || "").trim(),
    };

    let query = "";

    if (areaNorm === "RECE" || areaNorm === "RECEPCION") {
      // --MP (Materia Prima)
      query = `
        SELECT distinct t.COD_ART,
               t.Desc_Art,
               t.DESC_ETIQUETA,
               t2.DESC_SUB_CAT,
               t.SUB_CAT_ART,
               es.especie,
               'MP' TIPO_ART
          FROM ARTICULO t
          JOIN ARTICULO_SUB_CATEG t2 ON t.SUB_CAT_ART = t2.COD_SUB_CAT
          inner join tg_especies es on t2.cat_art=es.cat_art
          inner join plantilla_causa_desviacion pc on t2.cod_sub_cat=pc.cod_sub_cat
          inner join parte_produccion p on es.especie=p.especie
         WHERE
           t.FLAG_ESTADO IN ('1', 'A')
           AND (
                 UPPER(t.COD_ART)       LIKE '%'|| UPPER(trim(:busqueda)) ||'%'
              OR UPPER(t.Desc_Art)  LIKE  '%'||UPPER(:busqueda) ||'%'
              OR UPPER(t.DESC_ETIQUETA) LIKE '%'||UPPER(:busqueda)||'%'
           )
           and pc.cod_as = :codAs
           and t.cod_clase='21'
              and p.cod_parte_producc LIKE '%' || :parte || '%'
         ORDER BY t.Desc_Art
         FETCH FIRST 20 ROWS ONLY
      `;
    } else if (areaNorm === "EMPA" || areaNorm === "EMPAQUE") {
      // --PPTT (Producto Terminado, literal garavito.sql)
      query = `
        SELECT distinct t.COD_ART,
               t.Desc_Art,
               t.DESC_ETIQUETA,
               t2.DESC_SUB_CAT,
               t.SUB_CAT_ART,
               es.especie,
               'PPTT' TIPO_ART
          FROM ARTICULO t
          JOIN ARTICULO_SUB_CATEG t2 ON t.SUB_CAT_ART = t2.COD_SUB_CAT
          inner join tg_especies es on t2.cat_art=es.cat_art
          inner join plantilla_causa_desviacion pc on t2.cod_sub_cat=pc.cod_sub_cat
          inner join parte_produccion p on es.especie=p.especie
         WHERE
           t.FLAG_ESTADO IN ('1', 'A')
           AND (
                 UPPER(t.COD_ART)       LIKE '%'|| UPPER(trim(:busqueda)) ||'%'
              OR UPPER(t.Desc_Art)  LIKE  '%'||UPPER(:busqueda) ||'%'
              OR UPPER(t.DESC_ETIQUETA) LIKE '%'||UPPER(:busqueda)||'%'
           )
           and pc.cod_as = :codAs
           and t.cod_clase='01'
           and p.cod_parte_producc LIKE '%' || :parte || '%'
         ORDER BY t.Desc_Art
         FETCH FIRST 20 ROWS ONLY
      `;
    } else {
      // --ARTICULO CONGELADO | PROCESO (literal garavito.sql)
      query = `
        SELECT distinct t.cod_art_cong,
               t.descr desc_art ,
               '' as DESC_ETIQUETA,
               t2.DESC_SUB_CAT,
               t.cod_subcat,
               es.especie,
               'CONG' TIPO_ART
          FROM ARTICULO_CONGE t
          JOIN ARTICULO_SUB_CATEG t2 ON t.cod_subcat = t2.COD_SUB_CAT
          join articulo_categ t3 on t2.cat_art=t3.cat_art
          inner join tg_especies es on t3.cat_art=es.cat_art
          inner join plantilla_causa_desviacion pc on t2.cod_sub_cat=pc.cod_sub_cat
          inner join parte_produccion p on es.especie=p.especie
         WHERE (
                 UPPER(t.cod_art_cong)       LIKE '%'|| UPPER(trim(:busqueda)) ||'%'
              OR UPPER(t.descr)  LIKE  '%'||UPPER(:busqueda) ||'%'
            )
           and pc.cod_as = :codAs
           and p.cod_parte_producc LIKE '%' || :parte || '%'
         ORDER BY t.descr
         FETCH FIRST 20 ROWS ONLY
      `;
    }

    const rows = await db.execute(query, replacements);
    return rows.map((r) => {
      const low = this.toLowercaseKeys(r);
      low.cod_art = low.cod_art || r.COD_ART || r.COD_ART_CONG || "";
      //low.COD_ART = low.cod_art;

      low.nom_articulo =
        low.nom_articulo || r.NOM_ARTICULO || r.DESC_ART || r.DESCR || "";
      //low.NOM_ARTICULO = low.nom_articulo;

      low.desc_sub_cat = low.desc_sub_cat || r.DESC_SUB_CAT || "";
      //low.DESC_SUB_CAT = low.desc_sub_cat;

      low.desc_etiqueta = low.desc_etiqueta || r.DESC_ETIQUETA || "";
      //low.DESC_ETIQUETA = low.desc_etiqueta;

      low.sub_cat_art = low.sub_cat_art || r.SUB_CAT_ART || r.COD_SUBCAT || "";
      //low.SUB_CAT_ART = low.sub_cat_art;

      low.especie = low.especie || r.ESPECIE || "";
      //low.ESPECIE = low.especie;

      return low;
    });
  }

  // Obtener causas de desviación filtradas por área y artículo
  // Obtener causas de desviación filtradas por área y artículo / subcategoría
  static async getDeviationCauses(codSubCat) {
    let subCat = codSubCat ? String(codSubCat).trim() : null;

    /* if (!subCat && codArt && codArt.trim() !== "") {
      const artCode = String(codArt).trim();
      const art1 = await db.execute(
        `SELECT SUB_CAT_ART FROM ARTICULO WHERE TRIM(COD_ART) = :artCode`,
        { artCode },
      );
      if (art1.length > 0 && art1[0].SUB_CAT_ART) {
        subCat = String(art1[0].SUB_CAT_ART).trim();
      } else {
        const art2 = await db.execute(
          `SELECT COD_SUBCAT FROM ARTICULO_CONGE WHERE TRIM(COD_ART_CONG) = :artCode`,
          { artCode },
        );
        if (art2.length > 0 && art2[0].COD_SUBCAT) {
          subCat = String(art2[0].COD_SUBCAT).trim();
        }
      }
    } */

    /* if (subCat) {
      
    }
 */

    /* let areaWhere = "";
    const replacements = { subCat };

    if (codAs && codAs.trim() !== "") {
      areaWhere = " AND pcd.COD_AS = :codAs ";
      replacements.codAs = String(codAs).trim();
    } */

    const querySubCat = `
        select t2.cod_mcd,t2.descr,t3.descr categoria,t.cod_sub_cat from maestro_causas_desviacion_filtro t,maestro_causas_desviacion t2,categoria_causa t3
where t.cod_mcd=t2.cod_mcd and t2.cod_cat_causa=t3.cod_cat_causa
and t.cod_sub_cat=:subcat
order by t3.descr, t2.descr
      `;
    const causasSub = await db.execute(querySubCat, { subcat: subCat });

    console.log(codSubCat);
    if (causasSub.length > 0) {
      return causasSub.map((r) => this.toLowercaseKeys(r));
    }
    // 2. Fallback: catálogo maestro completo de causas
    // const queryDirect = `
    //   SELECT MIN(mcd.COD_MCD) as COD_MCD,
    //          mcd.DESCR,
    //          MIN(cc.DESCR) as CATEGORIA
    //     FROM MAESTRO_CAUSAS_DESVIACION mcd
    //     JOIN CATEGORIA_CAUSA cc ON mcd.COD_CAT_CAUSA = cc.COD_CAT_CAUSA
    //    GROUP BY mcd.DESCR
    //    ORDER BY mcd.DESCR
    // `;

    /*   const causas = await db.execute(queryDirect);
    return causas.map((r) => this.toLowercaseKeys(r)); */
  }

  // Obtener motivos de desviación asociados a un artículo / subcategoría y área
  static async getDeviationsByArticle(codAs, codSubCat) {
    let subCat = codSubCat ? String(codSubCat).trim() : null;

    /* if (!subCat && codArt && codArt.trim() !== "") {
      const artCode = String(codArt).trim();
      const art1 = await db.execute(
        `SELECT SUB_CAT_ART FROM ARTICULO WHERE TRIM(COD_ART) = :artCode`,
        { artCode },
      );
      if (art1.length > 0 && art1[0].SUB_CAT_ART) {
        subCat = String(art1[0].SUB_CAT_ART).trim();
      } else {
        const art2 = await db.execute(
          `SELECT COD_SUBCAT FROM ARTICULO_CONGE WHERE TRIM(COD_ART_CONG) = :artCode`,
          { artCode },
        );
        if (art2.length > 0 && art2[0].COD_SUBCAT) {
          subCat = String(art2[0].COD_SUBCAT).trim();
        }
      }
    } */

    /* let whereClause = " WHERE rv.FLAG_ESTADO IN ('1', 'A') ";
    const replacements = {};

    if (codAs && codAs.trim() !== "") {
      whereClause += " AND pcd.COD_AS = :codAs ";
      replacements.codAs = String(codAs).trim();
    }

    if (subCat) {
      whereClause += " AND TRIM(pcd.COD_SUB_CAT) = :subCat ";
      replacements.subCat = subCat;
    } */

    const query = `
      SELECT  
             mp.COD_PREGUNTA, 
             mp.DESCR as MOTIVO_DESVIACION,
              rv.cod_rv,
               mp.tipo_campo
        FROM MAESTRO_PREGUNTAS mp
        JOIN PREGUNTAS_VERSIONADO pv ON mp.COD_PREGUNTA = pv.COD_PREGUNTA
        JOIN REPORTES_VERSIONADO rv ON pv.COD_RV = rv.COD_RV
        JOIN PLANTILLA_CAUSA_DESVIACION pcd ON rv.COD_REPORTE = pcd.COD_REPORTE
        WHERE rv.FLAG_ESTADO IN ('1', 'A') 
        AND pcd.COD_AS = :codAs
        AND TRIM(pcd.COD_SUB_CAT) = :subCat
         ORDER BY mp.DESCR
    `;

    const rows = await db.execute(query, { codAs: codAs, subCat: subCat });
    if (rows.length > 0) {
      return rows.map((r) => this.toLowercaseKeys(r));
    }

    // Fallback: Si no hay coincidencia por subcategoría, devolver preguntas por área
    if (codAs) {
      const fallbackQuery = `
        SELECT DISTINCT 
               mp.COD_PREGUNTA, 
               mp.DESCR as MOTIVO_DESVIACION
          FROM MAESTRO_PREGUNTAS mp
          JOIN PREGUNTAS_VERSIONADO pv ON mp.COD_PREGUNTA = pv.COD_PREGUNTA
          JOIN REPORTES_VERSIONADO rv ON pv.COD_RV = rv.COD_RV
          JOIN PLANTILLA_CAUSA_DESVIACION pcd ON rv.COD_REPORTE = pcd.COD_REPORTE
         WHERE rv.FLAG_ESTADO IN ('1', 'A')
           AND pcd.COD_AS = :codAs
         ORDER BY mp.DESCR
      `;
      const fallbackRows = await db.execute(fallbackQuery, {
        codAs: String(codAs).trim(),
      });
      return fallbackRows.map((r) => this.toLowercaseKeys(r));
    }

    return [];
  }

  // Obtener Partes de Producción usando la consulta exacta con TG_ESPECIES y FLAG_ESTADO = 1
  static async getPartesProduccionRecientes(especie) {
    try {
      const rows = await db.execute(
        `
        select t.cod_parte_producc, to_char(t.fecha_part,'dd/mm/yyyy') fecha, t2.descr_especie 
        from parte_produccion t, tg_especies t2
        where t.especie=t2.especie and t.flag_estado=1 and trim(t.especie)=:especie
        order by t.fecha_part desc
      `,
        { especie },
      );
      return rows.map((r) => this.toLowercaseKeys(r));
    } catch (e) {
      console.error("Error obteniendo partes de producción con especies:", e);
      return [];
    }
  }
}

module.exports = InspectionModel;
