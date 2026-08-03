import { API_BASE_URL } from "../../config";

const apiRoute = `${API_BASE_URL}/api/inspecciones`;

export const crearCabecera = async (
  usuario,
  planDiario,
  area,
  articulo,
  programacion,
) => {
  try {
    const res = await fetch(`${apiRoute}/crear-cabecera`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        //cod_rv: (currentFormInfo || formularioInfo)?.cod_rv,
        area,
        nro_ref: programacion,
        cod_usr: usuario,
        parte_produccion: planDiario,
        articulo,
      }),
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    return {
      success: true,
      codigo: data.cod_rep_c,
    };
  } catch (e) {
    console.error("Error creando cabecera en Oracle:", e);
    return {
      error: true,
      message: e.message,
    };
  }
};

export const obtenterDesviaciones = async (params) => {
  try {
    const res = await fetch(
      `${apiRoute}/desviaciones-articulo?${params.toString()}`,
    );
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    return {
      success: true,
      desviaciones: data.desviaciones,
    };
  } catch (error) {
    console.error("Error obteniendo desviaciones:", error);
    return {
      error: true,
      message: error.message,
    };
  }
};

export const obtenterCausas = async (subcat) => {
  try {
    const res = await fetch(
      `${apiRoute}/causas-desviacion/?cod_sub_cat=${subcat}`,
    );
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    return {
      success: true,
      causas: data.causas || [],
    };
  } catch (error) {
    console.error("Error obteniendo causas:", error);
    return {
      error: true,
      message: error.message,
    };
  }
};

export const SaveDesviacion = async (
  codigoReporte,
  ReporteVersion,

  usuario,
  articulo,
  sub_cat,
  tipo_art,
  causa,
  respuestas,
) => {
  try {
    const res = await fetch(`${apiRoute}/sincronizar-progreso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cod_rep_c: codigoReporte,
        cod_rv: ReporteVersion,
        cod_usr: usuario,
        cod_art: articulo,
        tipo_art,
        sub_cat,
        causa,
        respuestas,
      }),
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error guardando desviacion:", error);
    return {
      error: true,
      message: error.message,
    };
  }
};

// Añadir en frontend/src/core/services/Desviacion.service.js
export const obtenerBorradorActivo = async (codUsr) => {
  try {
    const res = await fetch(`${apiRoute}/borrador-activo/${codUsr}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    return {
      success: true,
      draft: data.draft // Devolverá null si no tiene reportes incompletos hoy, o el objeto del reporte
    };
  } catch (error) {
    console.error("Error al buscar borrador activo en BD:", error);
    return { error: true, message: error.message };
  }
};

export const guardarDatosGenerales = async (cod_rep_c, cod_usr, cod_art, tipo_art, respuestas) => {
  try {
    const res = await fetch(`${apiRoute}/guardar-datos-generales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cod_rep_c, cod_usr, cod_art, tipo_art, respuestas }),
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.message);
    return { success: true, cod_rep_c: data.cod_rep_c };
  } catch (error) {
    console.error("Error guardando datos generales:", error);
    return { error: true, message: error.message };
  }
};
