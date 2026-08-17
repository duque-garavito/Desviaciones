import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/Context/AuthContext";

export default function SeleccionArea() {
  const navigate = useNavigate();

  const {
    turnoActual,
    seleccionarArea
  } = useAuth();

  const areas = turnoActual?.areas || [];

  const handleSeleccionarArea = (area) => {
    seleccionarArea(area);

    navigate("/inspecciones");
  };

  return (
    <div>
      <h2>Seleccionar área</h2>

      <p>
        Seleccione el área donde realizará el reporte.
      </p>

      {areas.length === 0 ? (
        <p>
          No tiene áreas programadas para este turno.
        </p>
      ) : (
        <div>
          {areas.map((area) => (
            <button
              key={area.cod_programacion || area.cod_as}
              onClick={() => handleSeleccionarArea(area)}
            >
              {area.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}