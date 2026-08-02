import React, { useState, useEffect } from "react";
import { FileText, ClipboardList, X } from "lucide-react";
import { API_BASE_URL } from "../../config";
import "../../assets/css/ModalDetalle.css";

function ModalDetalle({ id, isOpen, onClose }) {
  const [registrosGroup, setRegistrosGroup] = useState();
  const [cargando, setCargando] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState(null); // 'regId-preguntaId'

  useEffect(() => {
    if (isOpen && id) {
      cargarDetalle();
      setActiveTooltip(null);
    } else {
      setRegistrosGroup([]);
      setActiveTooltip(null);
    }
  }, [isOpen, id]);

  const cargarDetalle = async () => {
    setCargando(true);
    try {
      const ids = String(id)
        .split(",")
        .map((s) => s.trim());
      const promesas = ids.map(async (singleId) => {
        const res = await fetch(`${API_BASE_URL}/api/registros/${singleId}`);
        return await res.json();
      });
      const data = await Promise.all(promesas);
      setRegistrosGroup(data[0]);
      console.log(data);
    } catch (err) {
      console.error("Error al cargar detalle:", err);
    } finally {
      setCargando(false);
    }
  };

  // Obtener preguntas únicas
  const preguntasUnicas = React.useMemo(() => {
    if (!registrosGroup?.respuestas) return [];

    return [
      ...new Map(
        registrosGroup.respuestas.map((r) => [r.cod_pregunta, r]),
      ).values(),
    ];
  }, [registrosGroup]);

  // Índice para acceder rápidamente a las respuestas
  const respuestasMap = React.useMemo(() => {
    if (!registrosGroup?.respuestas) return {};

    const map = {};

    registrosGroup.respuestas.forEach((r) => {
      map[`${r.cod_pregunta}_${r.cod_art.trim()}`] = r.total_desviacion;
    });

    return map;
  }, [registrosGroup]);
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-detalle"
        style={{
          maxWidth: registrosGroup.length > 1 ? "99%" : "1150px",
          width: registrosGroup.length > 1 ? "1500px" : "92%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <FileText size={18} /> Detalle de Inspección
          </h3>
          <button className="btn-cerrar-modal" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {cargando ? (
            <div className="loader-container">
              <div className="spinner"></div>
            </div>
          ) : registrosGroup.cabecera ? (
            <>
              {(() => {
                const baseReg = registrosGroup.cabecera;
                const getDuracionGroup = () => {
                  if (!baseReg?.hora_inicio || !baseReg?.hora_fin) return null;
                  const inicio = new Date(baseReg.hora_inicio);
                  const fin = new Date(baseReg.hora_fin);
                  const diffMs = fin - inicio;
                  if (diffMs < 0) return null;
                  const diffMins = Math.floor(diffMs / 60000);
                  const diffSecs = Math.floor((diffMs % 60000) / 1000);
                  return diffMins === 0
                    ? `${diffSecs} seg`
                    : `${diffMins} min ${diffSecs} seg`;
                };

                return (
                  <div className="detalle-info-grid">
                    <div className="detalle-info-item">
                      <label>Inspector</label>
                      <span>{baseReg.inspector}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Formulario</label>
                      <span>{baseReg.formulario}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Área</label>
                      <span>{baseReg.area}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Fecha</label>
                      <span>{baseReg.fecha}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Hora Inicio</label>
                      <span>{baseReg.hora_inicio || "—"}</span>
                    </div>
                    <div className="detalle-info-item">
                      <label>Hora Fin</label>
                      <span>{baseReg.hora_fin || "—"}</span>
                    </div>
                    {baseReg.parte_produccion && (
                      <div className="detalle-info-item">
                        <label>Plan Diario</label>
                        <span style={{ fontWeight: "600", color: "#1e40af" }}>
                          {baseReg.parte_produccion} {baseReg.fecha_parte} (
                          {baseReg.especie})
                        </span>
                      </div>
                    )}
                    {getDuracionGroup() && (
                      <div className="detalle-info-item">
                        <label>Duración</label>
                        <span
                          style={{
                            color: "var(--color-primary)",
                            fontWeight: "600",
                          }}
                        >
                          {getDuracionGroup()}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="detalle-respuestas" style={{ overflowX: "auto" }}>
                <h4>
                  <ClipboardList size={14} /> Respuestas por Artículo
                </h4>

                <table
                  className="matriz-table"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: "10px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ minWidth: "240px" }}>
                        Variables / Preguntas
                      </th>
                      {registrosGroup.articulos.map((reg) => (
                        <th
                          key={reg.cod_art}
                          style={{
                            minWidth: "220px",
                            textAlign: "center",
                            padding: "10px 8px",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "700",
                              fontSize: "12px",
                              whiteSpace: "normal",
                              lineHeight: "1.3",
                            }}
                          >
                            {reg.desc_art ?? ""}
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#cbd5e1",
                              marginTop: "4px",
                              fontFamily: "monospace",
                            }}
                          >
                            {reg.cod_art}
                          </div>
                        </th>
                      ))}
                    </tr>
                    {/* Fila 1: Cantidad Muestreada */}
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "9px 14px",
                          fontWeight: "700",
                          fontSize: "13px",
                          color: "#000000",
                          backgroundColor: "#f1f5f9",
                        }}
                      >
                        Cantidad Muestreada
                      </th>

                      {registrosGroup.articulos.map((reg) => (
                        <th
                          key={reg.id}
                          style={{
                            textAlign: "center",
                            padding: "9px 8px",
                            fontWeight: "700",
                            fontSize: "16px",
                            color: "#000000",
                            backgroundColor: "#F5F8FC",
                          }}
                        >
                          {reg.cant_muestra}
                        </th>
                      ))}

                      {/* {registrosGroup.map((reg) => {
                        let val = 0;
                        if (
                          reg.cant_muestra !== null &&
                          reg.cant_muestra !== undefined
                        ) {
                          val = parseInt(reg.cant_muestra) || 0;
                        } else {
                          const muestraAns = reg.respuestas?.find(
                            (r) =>
                              r.pregunta?.toUpperCase().includes("MUESTR") ||
                              r.pregunta?.toUpperCase().includes("CANTIDAD") ||
                              r.pregunta?.toUpperCase().includes("EVALUAD"),
                          );
                          if (
                            muestraAns &&
                            muestraAns.resp_number !== null &&
                            muestraAns.resp_number !== undefined
                          ) {
                            val = parseInt(muestraAns.resp_number) || 0;
                          } else if (
                            reg.respuestas?.[0]?.resp_number !== null &&
                            reg.respuestas?.[0]?.resp_number !== undefined
                          ) {
                            val = parseInt(reg.respuestas[0].resp_number) || 0;
                          }
                        }
                        return (
                          <th
                            key={reg.id}
                            style={{
                              textAlign: "center",
                              padding: "9px 8px",
                              fontWeight: "700",
                              fontSize: "16px",
                              color: "#000000",
                              backgroundColor: "#F5F8FC",
                            }}
                          >
                            {val}
                          </th>
                        );
                      })} */}
                    </tr>

                    {/* Fila 2: Cantidad Sin Defecto */}
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "9px 14px",
                          fontWeight: "700",
                          fontSize: "13px",
                          color: "#000000",
                          backgroundColor: "#f1f5f9",
                        }}
                      >
                        Cantidad Sin Defecto
                      </th>
                      {/*  {registrosGroup.map((reg) => {
                        let cantMuestraNum = 0;
                        if (
                          reg.cant_muestra !== null &&
                          reg.cant_muestra !== undefined
                        ) {
                          cantMuestraNum = parseInt(reg.cant_muestra) || 0;
                        }

                        // Sumar los conteos de respuestas de desvío (resp_number) o usar la cantidad de causas registradas
                        let totalDesviadas = 0;
                        if (reg.respuestas && Array.isArray(reg.respuestas)) {
                          reg.respuestas.forEach((ans) => {
                            if (
                              ans.resp_number !== null &&
                              ans.resp_number !== undefined
                            ) {
                              totalDesviadas += parseInt(ans.resp_number) || 0;
                            }
                          });
                        }
                        if (
                          totalDesviadas === 0 &&
                          reg.causas &&
                          reg.causas.length > 0
                        ) {
                          totalDesviadas = reg.causas.length;
                        }

                        // Asegurar que las desviadas no superen el total muestreado
                        totalDesviadas = Math.min(
                          totalDesviadas,
                          cantMuestraNum,
                        );
                        const sinDefecto = Math.max(
                          0,
                          cantMuestraNum - totalDesviadas,
                        );

                        return (
                          <th
                            key={reg.id}
                            style={{
                              textAlign: "center",
                              padding: "9px 8px",
                              fontWeight: "700",
                              fontSize: "16px",
                              color: "#000000",
                              backgroundColor: "#F5F8FC",
                            }}
                          >
                            {sinDefecto}
                          </th>
                        );
                      })} */}
                      {registrosGroup.articulos.map((reg) => (
                        <th
                          key={reg.id}
                          style={{
                            textAlign: "center",
                            padding: "9px 8px",
                            fontWeight: "700",
                            fontSize: "16px",
                            color: "#000000",
                            backgroundColor: "#F5F8FC",
                          }}
                        >
                          {reg.total_buenas}
                        </th>
                      ))}
                    </tr>

                    {/* Fila 3: Cantidad Desviada (Con Defecto) */}
                    <tr style={{ borderBottom: "2px solid #cbd5e1" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "9px 14px",
                          fontWeight: "700",
                          fontSize: "13px",
                          color: "#000000",
                          backgroundColor: "#f1f5f9",
                        }}
                      >
                        Cantidad Desviada (Con Defecto)
                      </th>
                      {/* {registrosGroup.map((reg) => {
                        let cantMuestraNum = 0;
                        if (
                          reg.cant_muestra !== null &&
                          reg.cant_muestra !== undefined
                        ) {
                          cantMuestraNum = parseInt(reg.cant_muestra) || 0;
                        }

                        let totalDesviadas = 0;
                        if (reg.respuestas && Array.isArray(reg.respuestas)) {
                          reg.respuestas.forEach((ans) => {
                            if (
                              ans.resp_number !== null &&
                              ans.resp_number !== undefined
                            ) {
                              totalDesviadas += parseInt(ans.resp_number) || 0;
                            }
                          });
                        }
                        if (
                          totalDesviadas === 0 &&
                          reg.causas &&
                          reg.causas.length > 0
                        ) {
                          totalDesviadas = reg.causas.length;
                        }

                        totalDesviadas = Math.min(
                          totalDesviadas,
                          cantMuestraNum,
                        );

                        return (
                          <th
                            key={reg.id}
                            style={{
                              textAlign: "center",
                              padding: "9px 8px",
                              fontWeight: "700",
                              fontSize: "16px",
                              color: totalDesviadas > 0 ? "#dc2626" : "#000000",
                              backgroundColor: "#F5F8FC",
                            }}
                          >
                            {totalDesviadas}
                          </th>
                        );
                      })} */}
                      {registrosGroup.articulos.map((reg) => (
                        <th
                          key={reg.cod_art}
                          style={{
                            textAlign: "center",
                            padding: "9px 8px",
                            fontWeight: "700",
                            fontSize: "16px",
                            color:
                              reg.cant_muestra - reg.total_buenas > 0
                                ? "#dc2626"
                                : "#000000",
                            backgroundColor: "#F5F8FC",
                          }}
                        >
                          {reg.cant_muestra - reg.total_buenas}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preguntasUnicas.map((pregunta) => (
                      <tr key={pregunta.cod_pregunta}>
                        <td>{pregunta.pregunta}</td>

                        {registrosGroup.articulos.map((art) => (
                          <td
                            key={`${pregunta.cod_pregunta}-${art.cod_art}`}
                            style={{ textAlign: "center" }}
                          >
                            {respuestasMap[
                              `${pregunta.cod_pregunta}_${art.cod_art.trim()}`
                            ] ?? 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>No se encontró el registro.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalDetalle;
