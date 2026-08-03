import React, { useEffect, useState } from "react";
import { useDesviacion } from "../../core/Context/DesviacionContext";
import { obtenerPlanDiaEspecie } from "../../core/services/PlanDiario.service";
import { useAuth } from "../../core/Context/AuthContext";
import { crearCabecera } from "../../core/services/Desviacion.service";

export default function MdlConfirmarInicio() {
  const {
    articuloSeleccionado,
    limpiarDatosInspeccion,
    planSeleccionado,
    seleccionarPlan,
    seleccionarReporte,
  } = useDesviacion();

  const { usuarioActual, turnoActual } = useAuth();

  const [listaPlanes, setListaPlanes] = useState([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);

  useEffect(() => {
    const obtenerPlanes = async () => {
      if (!articuloSeleccionado) return;

      setLoadingPlanes(true);

      const peticion = await obtenerPlanDiaEspecie(
        articuloSeleccionado.especie,
      );

      if ("error" in peticion) {
        setListaPlanes([]);
      } else {
        setListaPlanes(peticion.data);
      }

      setLoadingPlanes(false);
    };

    obtenerPlanes();
  }, [articuloSeleccionado]);

  // Asignar automáticamente el primer plan SOLO cuando ya se cargó la lista
  useEffect(() => {
    if (!listaPlanes.length) return;

    if (!planSeleccionado) {
      seleccionarPlan(listaPlanes[0].cod_parte_producc);
    }
  }, [listaPlanes, planSeleccionado, seleccionarPlan]);

  const generarCabecera = async () => {
    const peticion = await crearCabecera(
      usuarioActual.usuario,
      planSeleccionado,
      turnoActual.codArea,
      articuloSeleccionado.cod_art,
      turnoActual.codProgramacion,
    );

    if (peticion.error) {
      console.error("Error creando cabecera:", peticion.message);
      return;
    }

    seleccionarReporte({
      codigoReporte: peticion.codigo,
      cod_rep_c: peticion.codigo,
      COD_REP_C: peticion.codigo,
      codigo: peticion.codigo,
    });
  };

  const parteObj =
    listaPlanes.find((p) => p.cod_parte_producc === planSeleccionado) ||
    listaPlanes[0];

  return (
    <div className="ins-modal-overlay">
      <div className="ins-modal-card">
        <h3>Iniciar Inspección</h3>

        <p style={{ marginBottom: "12px" }}>
          ¿Desea iniciar la inspección para el artículo{" "}
          <strong>
            {articuloSeleccionado.cod_art}
            {articuloSeleccionado.desc_art
              ? ` - ${articuloSeleccionado.desc_art}`
              : ""}
          </strong>
          ?
        </p>

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
            Parte de Producción del Día
          </label>

          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: parteObj || loadingPlanes ? "#1e3a8a" : "#ef4444",
            }}
          >
            {loadingPlanes
              ? "CARGANDO..."
              : parteObj
                ? `${parteObj.cod_parte_producc} - ${parteObj.descr_especie} ${parteObj.fecha}`
                : "NO SE HA ENCONTRADO PLAN DIARIO"}
          </div>
        </div>

        <div className="ins-modal-acciones">
          <button className="ins-modal-no" onClick={limpiarDatosInspeccion}>
            Cancelar
          </button>

          {parteObj && (
            <button
              className="ins-modal-yes"
              onClick={generarCabecera}
              disabled={loadingPlanes || !parteObj}
            >
              {loadingPlanes ? "Cargando..." : "Confirmar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
