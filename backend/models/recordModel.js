const db = require("../config/db");

class RecordModel {
  static formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  }

  static formatDateTime(date) {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
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
  static async getAll({
    area,
    inspector,
    fechaInicio,
    fechaFin,
    page = 1,
    limit = 20,
  }) {
    let where = [];
    let replacements = {};

    if (area) {
      where.push("pcd.COD_AS = :area");
      replacements.area = area;
    }
    if (inspector) {
      where.push("rc.COD_USR = :inspector");
      replacements.inspector = inspector;
    }

    const whereClause = where.length > 0 ? "WHERE " + where.join(" AND ") : "";

    const rows = await db.execute(
      `
      SELECT
    rc.COD_REP_C as id,
    rc.COD_RV,
    rc.NRO_REF as codprogramacion,
    LISTAGG(
        DISTINCT COALESCE(art.desc_art, artc.DESCR),
        ', '
    ) WITHIN GROUP (
        ORDER BY COALESCE(art.desc_art, artc.DESCR)
    ) AS nom_articulo,
    rc.TIPO_REF as tipo_ref,
    rc.FEC_REGISTRO as fecha_raw,
    u.NOMBRE as inspector,
    u.COD_USR as cod_inspector,
    mr.DESCR as formulario,
    a.DESCR as area,
    rv.COD_VERSION as version,
    (SELECT COUNT(*)
       FROM REPORTE_RESPUESTAS_DET
      WHERE COD_REP_C = rc.COD_REP_C) as total_respuestas
FROM REPORTE_RESPUESTAS rc
JOIN REPORTE_RESPUESTAS_DESVIACION_ARTICULO ra
    ON rc.cod_rep_c = ra.cod_rep_c
JOIN REPORTES_VERSIONADO rv
    ON rc.COD_RV = rv.COD_RV
JOIN MAESTRO_REPORTES mr
    ON rv.COD_REPORTE = mr.COD_REPORTE
LEFT JOIN (
    SELECT DISTINCT COD_REPORTE, COD_AS
    FROM PLANTILLA_CAUSA_DESVIACION
) pcd
    ON mr.COD_REPORTE = pcd.COD_REPORTE
LEFT JOIN AREAS_SUPERVISION a
    ON pcd.COD_AS = a.COD_AS
LEFT JOIN USUARIO u
    ON rc.COD_USR = u.COD_USR
LEFT JOIN ARTICULO art
    ON TRIM(ra.cod_art) = TRIM(art.COD_ART)
   AND TRIM(ra.tipo_art) IN ('MP','PPTT')
LEFT JOIN ARTICULO_CONGE artc
    ON TRIM(ra.cod_art) = TRIM(artc.COD_ART_CONG)
   AND TRIM(ra.tipo_art) = 'CONGE'


      ${whereClause}

      GROUP BY
    rc.COD_REP_C,
    rc.COD_RV,
    rc.NRO_REF,
    rc.TIPO_REF,
    rc.FEC_REGISTRO,
    u.NOMBRE,
    u.COD_USR,
    mr.DESCR,
    a.DESCR,
    rv.COD_VERSION
      ORDER BY rc.FEC_REGISTRO DESC
    `,
      replacements,
    );

    const normalizedRows = rows.map((r) => this.toLowercaseKeys(r));

    const formattedRows = normalizedRows.map((r) => ({
      ...r,
      fecha: this.formatDate(r.fecha_raw),
      hora_inicio: this.formatDateTime(r.fecha_raw),
      hora_fin: this.formatDateTime(r.fecha_raw),
    }));

    let filteredRows = formattedRows;
    if (fechaInicio) {
      const startLimit = new Date(fechaInicio + "T00:00:00");
      filteredRows = filteredRows.filter((r) => {
        if (!r.fecha_raw) return false;
        return new Date(r.fecha_raw) >= startLimit;
      });
    }
    if (fechaFin) {
      const endLimit = new Date(fechaFin + "T23:59:59");
      filteredRows = filteredRows.filter((r) => {
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
    filteredRows.forEach((reg) => {
      const grupoExistente = grupos.find((g) => {
        const matchMeta =
          g.inspector === reg.inspector &&
          g.formulario === reg.formulario &&
          g.area === reg.area &&
          g.fecha === reg.fecha;
        if (!matchMeta) return false;

        const t1 =
          getTimeMs(g.hora_fin_raw) ||
          getTimeMs(g.hora_inicio_raw) ||
          getTimeMs(g.fecha_raw);
        const t2 =
          getTimeMs(reg.hora_fin_raw) ||
          getTimeMs(reg.hora_inicio_raw) ||
          getTimeMs(reg.fecha_raw);

        if (t1 && t2) {
          return Math.abs(t1 - t2) <= 10 * 60000;
        }
        return true;
      });

      if (grupoExistente) {
        grupoExistente.ids.push(reg.id);
        // grupoExistente.lotes.push(reg.lote || "—");
        grupoExistente.id = grupoExistente.ids.join(", ");
        //grupoExistente.lote = grupoExistente.lotes.join(", ");
        grupoExistente.total_respuestas += reg.total_respuestas;
      } else {
        grupos.push({
          ...reg,
          ids: [reg.id],
          // lotes: [reg.lote || "—"],
          id: reg.id,
          // lote: reg.lote || "—",
          total_respuestas: reg.total_respuestas,
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
      registros: paginatedRows,
    };
  }

  // Obtener el detalle completo de una inspección específica
  static async getById(codRepC) {
    const header = await db.execute(
      `
        SELECT
        rc.COD_REP_C AS id,
     
        mr.COD_REPORTE AS cod_reporte,
        pcd.COD_AS AS cod_area,
      
        rc.TIPO_REF AS tipo_ref,
        rc.PARTE_PRODUCCION AS parte_produccion,
        to_char(pp.fecha_part,'dd/mm/yyyy') fecha_parte,
        pp.especie,
        rc.FEC_REGISTRO AS fecha_registro,
        u.NOMBRE AS inspector,
        mr.DESCR AS formulario,
        a.DESCR AS area,
        rv.COD_VERSION AS version
    FROM REPORTE_RESPUESTAS rc
    join parte_produccion pp on rc.parte_produccion=pp.cod_parte_producc
    JOIN REPORTES_VERSIONADO rv
        ON rc.COD_RV = rv.COD_RV
    JOIN MAESTRO_REPORTES mr
        ON rv.COD_REPORTE = mr.COD_REPORTE
    LEFT JOIN (
        SELECT DISTINCT COD_REPORTE, COD_AS
        FROM PLANTILLA_CAUSA_DESVIACION
    ) pcd
        ON mr.COD_REPORTE = pcd.COD_REPORTE
    LEFT JOIN AREAS_SUPERVISION a
        ON pcd.COD_AS = a.COD_AS
    LEFT JOIN USUARIO u
        ON rc.COD_USR = u.COD_USR
    WHERE rc.COD_REP_C = :codRepC
    `,
      { codRepC },
    );

    if (header.length === 0) return null;

    const normalizedHeader = this.toLowercaseKeys(header[0]);
    let normalizedArticulos = [];

    try {
      const artResult = await db.execute(
        `
        SELECT t.cod_rep_c,coalesce(t2.cod_art,t3.cod_art_cong) cod_art,
coalesce(t2.desc_art,t3.descr) desc_art,
t.cant_muestra,
SUM(
        CASE
            WHEN dt.cod_pregunta is null
            THEN 1
            ELSE 0
        END
    ) AS total_buenas
        FROM REPORTE_RESPUESTAS_DESVIACION_ARTICULO t
        join reporte_respuestas_det dt on t.cod_rep_c=dt.cod_rep_c and t.item_rrda=dt.item_rrda
        LEFT JOIN ARTICULO t2
            ON t.cod_art = t2.cod_art
          AND TRIM(t.tipo_art) IN ('MP', 'PPTT')
        LEFT JOIN ARTICULO_CONGE t3
            ON t.cod_art = t3.cod_art_cong
          AND TRIM(t.tipo_art) = 'CONGE'
        WHERE t.cod_rep_c = :codRepC
          AND (
                t2.cod_art IS NOT NULL
            OR t3.cod_art_cong IS NOT NULL)
            
            group by  t.cod_rep_c,coalesce(t2.cod_art,t3.cod_art_cong) ,
coalesce(t2.desc_art,t3.descr) ,
t.cant_muestra
          
        `,
        { codRepC },
      );
      if (artResult.length > 0) {
        normalizedArticulos = artResult.map((d) => this.toLowercaseKeys(d));
      }
    } catch (err) {
      console.error("[getById] Error al buscar artículo:", err.message);
    }

    const details = await db.execute(
      `
      SELECT
    COALESCE(a1.cod_art, a2.cod_art_cong) AS cod_art,
    COALESCE(a1.desc_art, a2.descr) AS desc_art,
    rd.cod_pregunta,
    mp.descr AS pregunta,
    mp.tipo_campo,
    SUM(
        CASE
            WHEN mp.tipo_campo = 'N'
            THEN NVL(rd.resp_number,0)
            ELSE 0
        END
    ) AS total_desviacion,
    rd.resp_varchar
FROM reporte_respuestas_desviacion_articulo ra
LEFT JOIN articulo a1
       ON ra.cod_art = a1.cod_art
      AND TRIM(ra.tipo_art) IN ('MP','PPTT')
LEFT JOIN articulo_conge a2
       ON ra.cod_art = a2.cod_art_cong
      AND TRIM(ra.tipo_art) = 'CONGE'
JOIN reporte_respuestas_det rd
     ON ra.cod_rep_c = rd.cod_rep_c
    AND ra.item_rrda = rd.item_rrda
JOIN maestro_preguntas mp
     ON rd.cod_pregunta = mp.cod_pregunta
WHERE rd.cod_rep_c = :codRepC
  AND (
        a1.cod_art IS NOT NULL
     OR a2.cod_art_cong IS NOT NULL
      )
GROUP BY
    COALESCE(a1.cod_art, a2.cod_art_cong),
    COALESCE(a1.desc_art, a2.descr),
    rd.cod_pregunta,
    mp.descr,
    mp.tipo_campo,
    ra.item_rrda,
    rd.resp_varchar
ORDER BY
    cod_art,
    pregunta
    `,
      { codRepC },
    );

    const normalizedDetails = details.map((d) => this.toLowercaseKeys(d));

    const causasDet = await db.execute(
      `
      SELECT ITEM, COD_MCD as cod_mcd FROM REPORTE_RESPUESTAS_DET_CAUSAS WHERE COD_REP_C = :codRepC
    `,
      { codRepC },
    );
    const normalizedCausas = causasDet.map((c) => this.toLowercaseKeys(c));

    let cantMuestra = null;
    try {
      const cantRes = await db.execute(
        `
        SELECT CANT_MUESTRA
          FROM REPORTE_RESPUESTAS_DESVIACION_ARTICULO
         WHERE COD_REP_C = :codRepC
         FETCH FIRST 1 ROWS ONLY
      `,
        { codRepC },
      );
      if (cantRes.length > 0) {
        const row = this.toLowercaseKeys(cantRes[0]);
        cantMuestra =
          row.cant_muestra !== null && row.cant_muestra !== undefined
            ? row.cant_muestra
            : null;
      }
    } catch (err) {
      console.error("[getById] Error leyendo CANT_MUESTRA:", err.message);
    }

    return {
      cabecera: {
        ...normalizedHeader,
        cant_muestra: cantMuestra,
        fecha: this.formatDate(normalizedHeader.fecha_registro),
        hora_inicio: this.formatDateTime(normalizedHeader.fecha_registro),
        hora_fin: this.formatDateTime(normalizedHeader.fecha_registro),
      },
      articulos: normalizedArticulos,
      respuestas: normalizedDetails,
      causas: normalizedCausas,
    };
  }

  // Obtener las áreas disponibles (para filtros)
  static async getAreas() {
    const rows = await db.execute(
      `SELECT COD_AS as COD_AREA, DESCR as DESCRIPCION 
       FROM AREAS_SUPERVISION 
       WHERE FLAG_ESTADO = 1`,
    );
    return rows.map((r) => ({
      COD_AREA: (r.COD_AREA || "").trim(),
      DESCRIPCION: (r.DESCRIPCION || "").trim(),
    }));
  }
}

module.exports = RecordModel;
