import React, { useState, useEffect } from "react";
import { data, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Calendar, Sun, Moon } from "lucide-react";
import "../assets/css/Dashboard.css";
import { useAuth } from "../core/Context/AuthContext";
import { ObtenerProgramacionPorUsuario } from "../core/services/Programacion.service";
import { ObtenerTurnoDia } from "../core/services/Auth.service";

export default function DashboardView() {
  const { usuarioActual, logout } = useAuth();
  const navigate = useNavigate();

  const currentUser = usuarioActual || {
    nombre: "Invitado",
    perfil: "Desconocido",
  };

  const [programacionInspector, setProgramacionInspector] = useState([]);
  const [cargando, setCargando] = useState(true);

  const obtenerTurnodelDia=async()=>
  {
    const data = await ObtenerTurnoDia(currentUser.usuario);
    if("error" in data){
      console.log(data.message);
      return {};
    }
    return data.turno;
  }

  useEffect(() => {
    const fetchProgramacion = async () => {
      const dataProg = await ObtenerProgramacionPorUsuario(currentUser.usuario);

      if ("error" in dataProg) {
        console.log(dataProg.message);
        setCargando(false);
        return;
      }

      setProgramacionInspector(dataProg.data);
      setCargando(false);
    };
    fetchProgramacion();
    obtenerTurnodelDia();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="inspector-view">
        <div className="content-section">
          <div className="section-header">
            <h3>
              <Calendar size={18} /> Programación Semanal
            </h3>
          </div>
          <p className="section-desc">
            Lista de inspecciones asignadas para su turno.
          </p>
          <div className="table-responsive">
            {cargando ? (
              <p style={{ padding: "20px", textAlign: "center" }}>
                Cargando programación...
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Área Asignada</th>
                    <th>Turno</th>
                  </tr>
                </thead>
                <tbody>
                  {programacionInspector.length > 0 ? (
                    programacionInspector.map((p, idx) => {
                      const todayStr = new Date().toLocaleDateString("sv-SE"); // Formato YYYY-MM-DD local
                      const isToday = p.FECHA === todayStr;

                      return (
                        <tr
                          key={idx}
                          className={isToday ? "clickable" : "disabled-row"}
                          onClick={() => {
                            if (isToday) navigate("/inspecciones");
                          }}
                          style={{
                            cursor: isToday ? "pointer" : "not-allowed",
                            opacity: isToday ? 1 : 0.55,
                          }}
                        >
                          <td>
                            <strong>
                              {(() => {
                                const [y, m, d] =
                                  p.FECHA.split("-").map(Number);
                                return new Date(y, m - 1, d).toLocaleDateString(
                                  "es-PE",
                                  {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "short",
                                  },
                                );
                              })()}
                            </strong>
                            {isToday && (
                              <span
                                style={{
                                  marginLeft: "10px",
                                  fontSize: "11px",
                                  background: "#22c55e",
                                  color: "white",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontWeight: "bold",
                                  textTransform: "uppercase",
                                }}
                              >
                                Hoy
                              </span>
                            )}
                          </td>
                          <td>{p.area}</td>
                          <td>
                            <span
                              className={`badge-turno ${p.TURNO === "Noche" ? "noche" : "día"}`}
                            >
                              {p.TURNO === "Noche" ? (
                                <Moon size={12} />
                              ) : (
                                <Sun size={12} />
                              )}{" "}
                              {p.TURNO}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        style={{
                          textAlign: "center",
                          padding: "30px",
                          color: "#888",
                        }}
                      >
                        No tiene programación asignada para esta semana.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
