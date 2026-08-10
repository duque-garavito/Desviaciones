import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../assets/css/Registros.css";
import {
  FileText,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Calendar,
  User,
  MapPin,
  Inbox,
} from "lucide-react";
import ModalDetalle from "../components/Registros/ModalDetalle";
import { useAuth } from "../core/Context/AuthContext";

export default function RegistrosView() {
  const navigate = useNavigate();
  // Estados principales
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const {  usuarioActual } = useAuth();

  // Estados para filtros
  const [areas, setAreas] = useState([]);
  const [inspectores, setInspectores] = useState([]);
  const esAdmin = usuarioActual.perfil=== "JF_CALID";
  const [filtros, setFiltros] = useState({
    area: "",
    inspector: esAdmin ? "" : usuarioActual.usuario || "",
    fechaInicio: "",
    fechaFin: "",
  });

  // Estado para modal de detalle
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // 1. Cargar datos iniciales (áreas e inspectores para los filtros)
  useEffect(() => {
    const cargarFiltros = async () => {
      try {
        const [resAreas, resInsp] = await Promise.all([
          fetch(`${API_BASE_URL}/api/registros/areas`),
          fetch(`${API_BASE_URL}/api/usuarios/inspectores`),
        ]);
        setAreas(await resAreas.json());
        setInspectores(await resInsp.json());
      } catch (err) {
        console.error("Error al cargar filtros:", err);
      }
    };
    cargarFiltros();
  }, []);

  // 2. Definir función de carga
  const cargarRegistros = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", 15);
      if (filtros.area) params.append("area", filtros.area);
      if (filtros.inspector) params.append("inspector", filtros.inspector);
      if (filtros.fechaInicio)
        params.append("fechaInicio", filtros.fechaInicio);
      if (filtros.fechaFin) params.append("fechaFin", filtros.fechaFin);

      const res = await fetch(
        `${API_BASE_URL}/api/registros?${params.toString()}`,
      );
      const data = await res.json();

      setRegistros(data.registros || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Error al cargar registros:", err);
    } finally {
      setCargando(false);
    }
  };

  // 3. Ejecutar carga al cambiar la página
  useEffect(() => {
    cargarRegistros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const aplicarFiltros = () => {
    setPage(1);
    cargarRegistros();
  };

  const limpiarFiltros = () => {
    setFiltros({
      area: "",
      inspector: esAdmin ? "" : usuario?.id,
      fechaInicio: "",
      fechaFin: "",
    });
    setPage(1);
    setTimeout(cargarRegistros, 100);
  };

  // 3. Ver detalle de un registro
  const verDetalle = (id) => {
    setSelectedId(id);
    setDetalleAbierto(true);
  };

  // 4. Estados y lógica para la vista de Matriz / Excel
  const [vistaMode, setVistaMode] = useState("tabla"); // 'tabla' o 'matriz'
  const [cargandoMatriz, setCargandoMatriz] = useState(false);
  const [datosMatriz, setDatosMatriz] = useState([]);
  const [activeTooltip, setActiveTooltip] = useState(null); // 'regId-preguntaId'

  const cargarDetallesMatriz = async (regs = registros) => {
    if (regs.length === 0) return;
    setCargandoMatriz(true);
    try {
      const promesas = regs.map(async (reg) => {
        const res = await fetch(`${API_BASE_URL}/api/registros/${reg.id}`);
        return await res.json();
      });
      const detalles = await Promise.all(promesas);
      setDatosMatriz(detalles);
    } catch (err) {
      console.error("Error al cargar detalles para la matriz:", err);
    } finally {
      setCargandoMatriz(false);
    }
  };

  // Volver a cargar la matriz automáticamente si cambian los registros filtrados
  useEffect(() => {
    if (vistaMode === "matriz") {
      cargarDetallesMatriz(registros);
    }
  }, [registros, vistaMode]);

  // Agrupar registros guardados en la misma transacción / sesión (mismo inspector, formulario, área y fecha)
  const agruparRegistros = (regs) => {
    const getTimeMs = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val.getTime();
      const t = new Date(val).getTime();
      return isNaN(t) ? null : t;
    };

    const grupos = [];
    regs.forEach((reg) => {
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
        if (!grupoExistente.ids.includes(reg.id)) {
          grupoExistente.ids.push(reg.id);
          grupoExistente.lotes.push(reg.lote || "—");
          grupoExistente.id = grupoExistente.ids.join(", ");
          grupoExistente.lote = grupoExistente.lotes.join(", ");
          grupoExistente.total_respuestas += reg.total_respuestas;
        }
      } else {
        grupos.push({
          ...reg,
          ids: reg.ids || [reg.id],
          lotes: reg.lotes || [reg.lote || "—"],
          id: reg.id,
          lote: reg.lote || "—",
          nom_articulo: reg.nom_articulo || "—",
          total_respuestas: reg.total_respuestas,
        });
      }
    });
    return grupos;
  };

  return (
    <div className="registros-container">
      {/* Encabezado */}
      <div className="registros-header">
        <div>
          <h2>
            <FileText size={22} /> Visualización de Registros
          </h2>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="filtros-bar">
        <div className="filtro-grupo">
          <label>
            <MapPin size={10} /> Área
          </label>
          <select
            value={filtros.area}
            onChange={(e) =>
              setFiltros((prev) => ({ ...prev, area: e.target.value }))
            }
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.COD_AREA} value={a.COD_AREA}>
                {a.DESCRIPCION}
              </option>
            ))}
          </select>
        </div>

        {esAdmin && (
          <div className="filtro-grupo">
            <label>
              <User size={10} /> Inspector
            </label>
            <select
              value={filtros.inspector}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, inspector: e.target.value }))
              }
            >
              <option value="">Todos los inspectores</option>
              {inspectores.map((i) => (
                <option key={i.COD_USR || i.id} value={i.COD_USR || i.id}>
                  {i.NOMBRE || i.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filtro-grupo">
          <label>
            <Calendar size={10} /> Desde
          </label>
          <input
            type="date"
            value={filtros.fechaInicio}
            onChange={(e) =>
              setFiltros((prev) => ({ ...prev, fechaInicio: e.target.value }))
            }
          />
        </div>

        <div className="filtro-grupo">
          <label>
            <Calendar size={10} /> Hasta
          </label>
          <input
            type="date"
            value={filtros.fechaFin}
            onChange={(e) =>
              setFiltros((prev) => ({ ...prev, fechaFin: e.target.value }))
            }
          />
        </div>

        <button className="btn-filtrar" onClick={aplicarFiltros}>
          <Search size={14} /> Buscar
        </button>
        <button className="btn-limpiar" onClick={limpiarFiltros}>
          Limpiar
        </button>
      </div>

      {/* Tabla de Registros */}
      <div className="registros-tabla-section">
        <div className="tabla-header">
          <h3>
            <ClipboardList size={16} /> Inspecciones Registradas
          </h3>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div
              className="toggle-container"
              style={{
                display: "flex",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            ></div>
            <span className="tabla-info">
              {total} registro(s) encontrado(s)
            </span>
          </div>
        </div>

        {cargando ? (
          <div className="loader-container">
            <div className="spinner"></div>
          </div>
        ) : registros.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Inbox size={32} />
            </div>
            <h4>No se encontraron registros</h4>
            <p>
              Aún no se han realizado inspecciones o no hay resultados para los
              filtros aplicados.
            </p>
          </div>
        ) : vistaMode === "matriz" ? (
          cargandoMatriz ? (
            <div className="loader-container">
              <div className="spinner"></div>
            </div>
          ) : datosMatriz.length === 0 ? (
            <div className="empty-state">
              <p>No se cargaron los detalles de los registros.</p>
            </div>
          ) : (
            <div className="matriz-container-wrapper">
              <table className="matriz-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "280px" }}>Variables / Preguntas</th>
                    {datosMatriz.map((reg) => (
                      <th
                        key={reg.id}
                        style={{ minWidth: "160px", textAlign: "center" }}
                      >
                        <div
                          style={{
                            fontWeight: "700",
                            fontSize: "14px",
                            color: "#f8fafc",
                          }}
                        >
                          {reg.lote || "—"}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#cbd5e1",
                            marginTop: "4px",
                          }}
                        >
                          {reg.fecha}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#e2e8f0",
                            marginTop: "2px",
                          }}
                        >
                          {reg.inspector}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            justifyContent: "center",
                            marginTop: "8px",
                          }}
                        >
                          <button
                            type="button"
                            className="btn-ver-detalle"
                            style={{
                              padding: "2px 8px",
                              fontSize: "10px",
                              backgroundColor: "white",
                              color: "var(--color-primary)",
                              border: "1px solid white",
                            }}
                            onClick={() => verDetalle(reg.id)}
                          >
                            <Eye size={10} /> Ver
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const getPreguntasMatriz = () => {
                      if (datosMatriz.length === 0) return [];
                      return datosMatriz[0].respuestas || [];
                    };
                    const pregs = getPreguntasMatriz();

                    return pregs.map((p, pIdx) => {
                      const isMainRow = pIdx < 3;
                      const isFirstDeviation = pIdx === 3;

                      const getCellClass = (r, regId) => {
                        if (!r) return "matriz-cell-val";
                        let cls = "matriz-cell-val";
                        if (r.tipo_campo === "B") {
                          const val = r.resp_char?.trim().toUpperCase();
                          if (val === "C" || val === "S") cls += " conforme";
                          if (val === "N") cls += " no-conforme";
                        } else if (r.tipo_campo === "N") {
                          const val = parseFloat(r.resp_number);
                          if (!isNaN(val) && val >= 1 && pIdx >= 3) {
                            cls += " no-conforme";
                          }
                        }
                        if (
                          r.resp_varchar &&
                          r.resp_varchar.includes("Causas:")
                        ) {
                          cls += " has-comment";
                        }
                        if (activeTooltip === `${regId}-${p.cod_pregunta}`) {
                          cls += " active-tooltip";
                        }
                        return cls;
                      };

                      const getCellContent = (r) => {
                        if (!r) return "—";
                        if (r.tipo_campo === "B") {
                          const val = r.resp_char?.trim().toUpperCase();
                          if (val === "C") return "Conforme";
                          if (val === "S") return "Sí";
                          if (val === "N") return "No Conforme";
                          return val || "—";
                        }
                        if (r.tipo_campo === "N") {
                          const val =
                            r.resp_number !== null &&
                            r.resp_number !== undefined
                              ? r.resp_number
                              : "—";
                          if (
                            r.resp_varchar &&
                            r.resp_varchar.includes("Causas:")
                          ) {
                            let causasText = r.resp_varchar;
                            if (causasText.startsWith("Causas: "))
                              causasText = causasText.substring(8);
                            return (
                              <>
                                {val}
                                <span className="tooltip-content">
                                  <strong>Desvíos registrados:</strong>
                                  {causasText.split(" | ").map((line, lIdx) => (
                                    <div
                                      key={lIdx}
                                      style={{ marginBottom: "2px" }}
                                    >
                                      • {line}
                                    </div>
                                  ))}
                                </span>
                              </>
                            );
                          }
                          return val;
                        }
                        return r.resp_varchar || "—";
                      };

                      if (isMainRow) {
                        return (
                          <tr key={p.cod_pregunta}>
                            <td className="matriz-header-pregunta">
                              {p.pregunta}
                            </td>
                            {datosMatriz.map((reg) => {
                              const ans = reg.respuestas.find(
                                (r) => r.cod_pregunta === p.cod_pregunta,
                              );
                              const hasComment =
                                ans?.resp_varchar &&
                                ans.resp_varchar.includes("Causas:");
                              return (
                                <td
                                  key={reg.id}
                                  className={getCellClass(ans, reg.id)}
                                  style={{
                                    cursor: hasComment ? "pointer" : "default",
                                  }}
                                  onClick={() => {
                                    if (hasComment) {
                                      const key = `${reg.id}-${p.cod_pregunta}`;
                                      setActiveTooltip(
                                        activeTooltip === key ? null : key,
                                      );
                                    }
                                  }}
                                >
                                  {getCellContent(ans)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      }

                      return (
                        <tr key={p.cod_pregunta}>
                          <td style={{ fontWeight: "500", color: "#475569" }}>
                            {p.pregunta.replace(/^DESVIACIONES\s+/i, "")}
                          </td>
                          {datosMatriz.map((reg) => {
                            const ans = reg.respuestas.find(
                              (r) => r.cod_pregunta === p.cod_pregunta,
                            );
                            const hasComment =
                              ans?.resp_varchar &&
                              ans.resp_varchar.includes("Causas:");
                            return (
                              <td
                                key={reg.id}
                                className={getCellClass(ans, reg.id)}
                                style={{
                                  cursor: hasComment ? "pointer" : "default",
                                }}
                                onClick={() => {
                                  if (hasComment) {
                                    const key = `${reg.id}-${p.cod_pregunta}`;
                                    setActiveTooltip(
                                      activeTooltip === key ? null : key,
                                    );
                                  }
                                }}
                              >
                                {getCellContent(ans)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <>
            <div className="table-responsive">
              <table className="registros-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Área</th>
                    <th>Inspector</th>
                    <th>Formulario</th>
                    <th>Artículo(s)</th>
                    {/*<th>Respuestas</th>
                      {/*<th>Acciones</th>*/}
                  </tr>
                </thead>
                <tbody>
                  {agruparRegistros(registros).map((reg) => (
                    <tr key={reg.id} onClick={() => verDetalle(reg.id)}>
                      <td
                        style={{
                          fontSize: "13px",
                          fontWeight: "500",
                          color: "#475569",
                        }}
                      >
                        {reg.fecha}
                      </td>
                      <td>
                        <span className="badge-area">{reg.area}</span>
                      </td>
                      <td style={{ fontWeight: "600", color: "#0f172a" }}>
                        {reg.inspector}
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {reg.formulario}{" "}
                        <span className="badge-version">v{reg.version}</span>
                      </td>
                      <td style={{ fontWeight: "600", color: "#1e293b" }}>
                        {/*  <div>
                          {(() => {
                            const lotesArr = (reg.lote || "")
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                            const lotesUnicos = [...new Set(lotesArr)];
                            return lotesUnicos.join(", ") || "—";
                          })()}
                        </div> */}
                        {reg.nom_articulo && reg.nom_articulo !== "—" && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#64748b",
                              fontWeight: "normal",
                            }}
                          >
                            {reg.nom_articulo}
                          </div>
                        )}
                      </td>
                      {/*} <td style={{ textAlign: 'center', fontWeight: '700', color: '#1756a6' }}>{reg.total_respuestas}</td>
                        {/*<td style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className="btn-ver-detalle"
                            onClick={(e) => { e.stopPropagation(); verDetalle(reg.id); }}
                          >
                            <Eye size={14} /> Ver Detalle
                          </button>
                        </td>*/}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {total > 0 && (
              <div className="paginacion">
                <button
                  className="btn-paginacion"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} /> Anterior
                </button>
                <span className="paginacion-info">
                  Página {page} de {totalPages}
                </span>
                <button
                  className="btn-paginacion"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ModalDetalle
        id={selectedId}
        isOpen={detalleAbierto}
        onClose={() => setDetalleAbierto(false)}
      />
    </div>
  );
}
