import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../core/Context/AuthContext";
import { MapPin, Building2, ChevronRight, Calendar } from "lucide-react";
import "../../assets/css/Inspecciones.css";

export default function SeleccionArea() {
  const navigate = useNavigate();

  const { turnoActual, seleccionarArea } = useAuth();

  const areas = turnoActual?.areas || [];

  const handleSeleccionarArea = (area) => {
    seleccionarArea(area);
    navigate("/inspecciones");
  };

  return (
    <div className="ins-pantalla-articulo">
      {/* Header elegante */}
      <div className="ins-articulo-header">
        <div className="ins-header-info">
          <div className="ins-header-icon-badge">
            <MapPin size={22} />
          </div>
          <div>
            <h2 className="ins-header-title">Selección de Área</h2>
            <p className="ins-header-subtitle">
              Seleccione el área donde realizará el reporte de inspección.
            </p>
          </div>
        </div>

        {turnoActual && (
          <div className="ins-conteo-card">
            <Calendar size={16} style={{ color: "#2563eb" }} />
            <span className="ins-conteo-label">
              Turno:{" "}
              <strong style={{ color: "#0f172a" }}>
                {turnoActual.nombre || turnoActual.turno || "Programado"}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Áreas disponibles */}
      {areas.length === 0 ? (
        <div className="ins-lista-vacia" style={{ padding: "80px 20px" }}>
          <Building2 size={44} className="ins-vacia-icon" />
          <p style={{ fontWeight: 600, fontSize: "16px", color: "#475569" }}>
            No tiene áreas programadas para este turno.
          </p>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            Verifique su programación semanal en el panel principal.
          </span>
        </div>
      ) : (
        <div>
          <div className="ins-resultados-count" style={{ marginBottom: "14px" }}>
            <span>Áreas disponibles ({areas.length})</span>
          </div>

          <div className="ins-area-grid">
            {areas.map((area, idx) => {
              const nombreArea = area.nombre || area.NOMBRE || "Área";
              const codArea =
                area.cod_as || area.COD_AS || area.cod_programacion || "";

              return (
                <div
                  key={area.cod_programacion || area.cod_as || idx}
                  className="ins-area-card"
                  onClick={() => handleSeleccionarArea(area)}
                >
                  <div className="ins-area-card-icon">
                    <Building2 size={24} />
                  </div>
                  <div className="ins-area-card-body">
                    <h3 className="ins-area-card-title">{nombreArea}</h3>
                    {codArea && (
                      /*<span className="ins-area-card-badge">
                        CÓDIGO: {codArea}
                      </span>*/
                      <span className="ins-area-card-badge"></span>
                    )}
                  </div>
                  <ChevronRight size={20} className="ins-area-card-arrow" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}