import React, { useEffect, useState } from "react";
import { useDesviacion } from "../../core/Context/DesviacionContext";
import { obtenerPlanDiaEspecie } from "../../core/services/PlanDiario.service";
import { useAuth } from "../../core/Context/AuthContext";
import { crearCabecera } from "../../core/services/Desviacion.service";

export default function MdlConfirmarInicio() {
  const {
    articuloSeleccionado,
    seleccionarArticulo,
    planSeleccionado,
    seleccionarPlan,
    seleccionarReporte,
  } = useDesviacion();
  const { usuarioActual } = useAuth();

  const [listaPlanes, setListaPlanes] = useState([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);

  const obtenerPlanes = async () => {
    setLoadingPlanes(true);
    const peticion = await obtenerPlanDiaEspecie(articuloSeleccionado.especie);
    if ("error" in peticion) setListaPlanes([]);
    else setListaPlanes(peticion.data);

    setLoadingPlanes(false);
  };

  const generarCabecera = async () => {
    const peticion = await crearCabecera(
      usuarioActual.usuario,
      planSeleccionado,
      usuarioActual.codArea,
      articuloSeleccionado.COD_ART,
    );

    if (peticion.error) {
      console.error("Error creando cabecera en Oracle:", peticion.message);
      return;
    }

    seleccionarReporte({ codigoReporte: peticion.codigo });
  };

  useEffect(() => {
    obtenerPlanes();
  }, []);

  return (
    <div className="ins-modal-overlay">
      <div className="ins-modal-card">
        <h3>Iniciar Inspección</h3>
        <p style={{ marginBottom: "12px" }}>
          ¿Desea iniciar la inspección para el artículo:{" "}
          <strong>
            {articuloSeleccionado.COD_ART}{" "}
            {articuloSeleccionado.NOM_ARTICULO
              ? `- ${articuloSeleccionado.NOM_ARTICULO}`
              : ""}
          </strong>
          ?
        </p>

        {
          /* Parte de Producción automático asignado desde Oracle */

          <div
            style={{
              textAlign: "left",
              marginBottom: "16px",
              backgroundColor: "#f8fafc",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "4px",
              }}
            >
              Parte de Producción del Día:
            </label>
            <div
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#1e3a8a",
              }}
            >
              {(() => {
                const parteObj =
                  listaPlanes.find(
                    (p) => p.cod_parte_producc === planSeleccionado,
                  ) || listaPlanes[0];
                if (parteObj) {
                  const descStr = parteObj.descr_especie
                    ? ` ${parteObj.descr_especie}`
                    : "";
                  seleccionarPlan(parteObj.cod_parte_producc);
                  return `${parteObj.cod_parte_producc} - ${descStr} ${parteObj.fecha}`;
                }
                return planSeleccionado || "Asignado automáticamente";
              })()}
            </div>
          </div>
        }

        <div className="ins-modal-acciones">
          <button
            className="ins-modal-no"
            onClick={() => {
              seleccionarArticulo(null);
              // setParteProduccionInput('');
            }}
          >
            Cancelar
          </button>
          <button
            className="ins-modal-yes"
            onClick={generarCabecera}
            disabled={loadingPlanes}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
