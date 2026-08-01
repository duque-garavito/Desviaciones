import { API_BASE_URL } from "../../config";

const apiRoute = `${API_BASE_URL}/api/inspecciones`;

export const crearCabecera = async (usuario, planDiario, area, articulo) => {
  try {
    const res = await fetch(`${apiRoute}/crear-cabecera`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        //cod_rv: (currentFormInfo || formularioInfo)?.cod_rv,
        area,
        nro_ref: "",
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
