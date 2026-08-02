import { useState, useEffect } from "react";
import logoApk from "../../assets/images/logo apk desviaciones.png";
import { Loader2, CheckCircle2, AlertCircle, Check, Save } from "lucide-react";
import { useDesviacion } from "../../core/Context/DesviacionContext";
import { useAuth } from "../../core/Context/AuthContext";
import {
  obtenterCausas,
  obtenterDesviaciones,
  SaveDesviacion,
} from "../../core/services/Desviacion.service";

export default function Formulario({ articulo, codRepC }) {
  const {
    articuloSeleccionado,
    reporteGenerado,
    limpiarArticulo,
    muestrasActuales,
    asignarMuestras,
    limpiarDatosInspeccion,
  } = useDesviacion();
  const { usuarioActual, turnoActual } = useAuth();
  // Separar preguntas tipo V (texto) de las numéricas/binarias
  // const preguntasMuestreo = preguntas.filter(p => p.tipo_campo !== 'V');

  const [muestraActual, setMuestraActual] = useState(
    muestrasActuales.length + 1,
  );
  const [desviacionSeleccionada, setDesviacionSeleccionada] = useState(null);
  const [causaSeleccionada, setCausaSeleccionada] = useState(null);

  // const [muestrasGuardadas, setMuestrasGuardadas] = useState([]);

  const [desviacionesDisponibles, setDesviacionesDisponibles] = useState([]);
  const [cargandoDesviaciones, setCargandoDesviaciones] = useState(false);

  const [causasDisponibles, setCausasDisponibles] = useState([]);
  const [categoriaCausaActiva, setCategoriaCausaActiva] = useState("TODAS");

  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false);
  const [confirmarCambiarArticulo, setConfirmarCambiarArticulo] =
    useState(false);

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Auto-guardar borrador local Y sincronizar en BD de Oracle ante cualquier cambio en las muestras
  /* useEffect(() => {
    if (articulo && usuario?.id && muestrasGuardadas.length > 0) {
      try {
        const draftObj = {
          articulo,
          codRepC,
          // conteoMuestra,
          // formularioInfo,
          // preguntas,
          // camposTextoValues,
          // muestraActual,
          // muestrasGuardadas,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`draft_inspeccion_${usuario.id}`, JSON.stringify(draftObj));
      } catch (err) {
        console.error("Error guardando borrador local:", err);
      }
    }

    const sincronizarProgresoEnBD = async () => {
      if (codRepC && muestrasGuardadas.length > 0) {
        try {
          const muestrasConDesvio = muestrasGuardadas.filter(m => !m.sinDefecto);
          const respuestasMuestreo = preguntasMuestreo.map(p => {
            const desviosDeEstaPregunta = muestrasConDesvio.filter(m => 
              (m.desviacionCod && String(m.desviacionCod).trim() === String(p.id).trim()) ||
              (m.desviacionLabel && p.texto && String(m.desviacionLabel).trim().toLowerCase() === String(p.texto).trim().toLowerCase()) ||
              (m.desviacionLabel && p.descr && String(m.desviacionLabel).trim().toLowerCase() === String(p.descr).trim().toLowerCase())
            );
            const countDesvios = desviosDeEstaPregunta.length;
            if (p.tipo_campo === 'N' || countDesvios > 0) {
              return {
                cod_pregunta: p.id,
                resp_char: null,
                resp_number: countDesvios,
                resp_varchar: null,
                causas: desviosDeEstaPregunta.map(m => ({
                  cod_mcd: m.causaCod,
                  cod_sub_cat: m.causaSubCat,
                  cod_especi: m.causaEspeci
                })).filter(c => c.cod_mcd)
              };
            }
            return {
              cod_pregunta: p.id,
              resp_char: p.tipo_campo === 'B' ? 'S' : null,
              resp_number: null,
              resp_varchar: null,
              causas: []
            };
          });

          await fetch(`${API_BASE_URL}/api/inspecciones/sincronizar-progreso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cod_rep_c: codRepC,
              cod_rv: formularioInfo?.cod_rv,
              cod_usr: usuario?.id,
              respuestas: respuestasMuestreo,
              conteo_muestra: String(muestrasGuardadas.length)
            })
          });
        } catch (err) {
          console.error("Error sincronizando avance en BD Oracle:", err);
        }
      }
    };
    sincronizarProgresoEnBD();
  }, [muestrasGuardadas, codRepC, articulo, usuario, conteoMuestra, formularioInfo, preguntas, camposTextoValues, muestraActual]); */

  useEffect(() => {
    const cargarDesviaciones = async () => {
      if (!articuloSeleccionado) return;

      setCargandoDesviaciones(true);

      try {
        const params = new URLSearchParams();

        params.set("cod_as", turnoActual.codArea);

        // params.set("cod_art", String(articuloSeleccionado.cod_art).trim());
        const subCatVal = articuloSeleccionado?.sub_cat_art;
        if (subCatVal) {
          params.set("cod_sub_cat", String(subCatVal).trim());
        }

        const peticion = await obtenterDesviaciones(params);
        const peticion2 = await obtenterCausas(subCatVal);

        if ("error" in peticion) {
          setDesviacionesDisponibles([]);
          return;
        }

        if ("error" in peticion2) {
          setDesviacionesDisponibles([]);
          return;
        }

        setDesviacionesDisponibles(peticion.desviaciones);
        setCausasDisponibles(peticion2.causas);
      } catch (error) {
        console.log(error);
        setDesviacionesDisponibles([]);
      } finally {
        setCargandoDesviaciones(false);
      }
    };
    cargarDesviaciones();
  }, []);

  const fase = !desviacionSeleccionada ? "desviaciones" : "causas";

  const handleSeleccionarDesviacion = (desv) => {
    setDesviacionSeleccionada(desv);
    setCausaSeleccionada(null);
  };

  const handleSeleccionarCausa = (causa) => {
    setCausaSeleccionada(causa);
    setMostrarConfirm(true);
  };

  const confirmarGuardar = async () => {
    // if (causaSeleccionada) {
    const muestra = {
      nro: muestraActual,
      desviacionLabel: desviacionSeleccionada?.motivo_desviacion || null,
      desviacionCod: desviacionSeleccionada?.cod_pregunta || null,
      causaLabel: causaSeleccionada?.descr || null,
      causaCod: causaSeleccionada?.cod_mcd || null,
      causaSubCat: causaSeleccionada?.cod_sub_cat || null,
      causaEspeci: causaSeleccionada?.cod_especi || null,
      sinDefecto: desviacionSeleccionada?.cod_pregunta ? true : false,
    };

    const peticion = await SaveDesviacion(
      reporteGenerado.codigoReporte,
      desviacionSeleccionada?.cod_rv ?? null,
      usuarioActual.usuario,
      articuloSeleccionado.cod_art,
      articuloSeleccionado.sub_cat_art,
      articuloSeleccionado.tipo_art,
      causaSeleccionada?.cod_mcd ?? null,
      [
        {
          resp_number: 1,
          cod_pregunta: desviacionSeleccionada?.cod_pregunta,
        },
      ],
    );

    if (peticion.success) {
      asignarMuestras(muestra);
      setMuestraActual((prev) => prev + 1);
    }
    /* } else {
      const muestra = {
        nro: muestraActual,
        desviacionLabel: null,
        desviacionCod: null,
        causaLabel: null,
        causaCod: null,
        causaSubCat: null,
        causaEspeci: null,
        sinDefecto: true,
      };

      const peticion = await SaveDesviacion(
        reporteGenerado.codigoReporte,
        desviacionSeleccionada.cod_rv,
        usuarioActual.usuario,
        articuloSeleccionado.cod_art,
        articuloSeleccionado.sub_cat_art,
        articuloSeleccionado.tipo_art,
        causaSeleccionada.cod_mcd,
        [],
      );

      if (peticion.success) setMuestrasGuardadas((prev) => [...prev, muestra]);
    } */
    setMostrarConfirm(false);
    resetMuestra();
  };

  const handleSinDefecto = () => {
    /*  setDesviacionSeleccionada(null);
    setCausaSeleccionada(null); */
    resetMuestra();
    setMostrarConfirm(true);
  };

  const resetMuestra = () => {
    // setMuestraActual((prev) => prev + 1);
    setDesviacionSeleccionada(null);
    setCausaSeleccionada(null);
  };

  const handleCambiarArticulo = () => {
    limpiarArticulo();
  };
  const handleFinalizarReporte = () => {
    if (muestrasActuales.length === 0) {
      setMensaje({
        tipo: "error",
        texto: "Registre al menos una muestra antes de finalizar.",
      });
      setTimeout(() => setMensaje(null), 2000);
      return;
    }
    setConfirmarFinalizar(true);
  };

  const ejecutarFinalizarReporte = async (afterAction = "finalizar") => {
    setConfirmarFinalizar(false);
    setEnviando(true);
    try {
      const horaFin = new Date().toISOString();
      const muestrasConDesvio = muestrasGuardadas.filter((m) => !m.sinDefecto);
      const totalDesvios = muestrasConDesvio.length;
      const totalSinDefecto = muestrasGuardadas.filter(
        (m) => m.sinDefecto,
      ).length;

      // Construir respuestas: primero los campos de texto (tipo V) con sus valores ya ingresados
      const preguntasTexto = preguntas.filter((p) => p.tipo_campo === "V");
      const respuestasTexto = preguntasTexto.map((p) => ({
        cod_pregunta: p.id,
        resp_char: null,
        resp_number: null,
        resp_varchar:
          camposTextoValues && camposTextoValues[p.id]
            ? camposTextoValues[p.id].trim()
            : null,
        causas: [],
      }));

      // Luego las respuestas del muestreo (tipo N/B)
      const respuestasMuestreo = preguntasMuestreo.map((p) => {
        const desviosDeEstaPregunta = muestrasConDesvio.filter(
          (m) =>
            (m.desviacionCod &&
              String(m.desviacionCod).trim() === String(p.id).trim()) ||
            (m.desviacionLabel &&
              p.texto &&
              String(m.desviacionLabel).trim().toLowerCase() ===
                String(p.texto).trim().toLowerCase()) ||
            (m.desviacionLabel &&
              p.descr &&
              String(m.desviacionLabel).trim().toLowerCase() ===
                String(p.descr).trim().toLowerCase()),
        );
        const countDesvios = desviosDeEstaPregunta.length;

        if (p.tipo_campo === "N" || countDesvios > 0) {
          return {
            cod_pregunta: p.id,
            resp_char: null,
            resp_number: countDesvios,
            resp_varchar: null,
            causas: desviosDeEstaPregunta
              .map((m) => ({
                cod_mcd: m.causaCod,
                cod_sub_cat: m.causaSubCat,
                cod_especi: m.causaEspeci,
              }))
              .filter((c) => c.cod_mcd),
          };
        }
        return {
          cod_pregunta: p.id,
          resp_char: p.tipo_campo === "B" ? "S" : null,
          resp_number: null,
          resp_varchar: null,
          causas: [],
        };
      });

      const respuestasArray = [...respuestasTexto, ...respuestasMuestreo];

      let res;
      if (codRepC) {
        // Si ya existe cabecera activa creada al inicio, sincronizar y finalizar el borrador en Oracle
        res = await fetch(
          `${API_BASE_URL}/api/inspecciones/sincronizar-progreso`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cod_rep_c: codRepC,
              cod_rv: formularioInfo?.cod_rv,
              cod_usr: usuario?.id,
              nro_ref: articulo?.COD_ART,
              respuestas: respuestasMuestreo,
              conteo_muestra: conteoMuestra || String(muestrasGuardadas.length),
            }),
          },
        );
      } else {
        // Si no existía cabecera previa, llamar a guardar creando la cabecera
        res = await fetch(`${API_BASE_URL}/api/inspecciones/guardar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cod_rv: formularioInfo?.cod_rv,
            nro_ref: articulo?.COD_ART,
            cod_usr: usuario?.id,
            conteo_muestra: conteoMuestra || String(muestrasGuardadas.length),
            total_desvios: totalDesvios,
            total_sin_defecto: totalSinDefecto,
            respuestas: respuestasArray,
            hora_inicio: new Date().toISOString(),
            hora_fin: horaFin,
          }),
        });
      }
      const data = await res.json();
      if (data.success) {
        if (usuario?.id) {
          localStorage.removeItem(`draft_inspeccion_${usuario.id}`);
        }
        setMensaje({
          tipo: "success",
          texto: "¡Reporte guardado correctamente!",
        });
        setTimeout(() => {
          setMensaje(null);
          if (afterAction === "cambiarArticulo") {
            onCambiarArticulo();
          } else {
            onFinalizar();
          }
        }, 2000);
      } else {
        setMensaje({
          tipo: "error",
          texto: data.message || "Error al guardar.",
        });
        setTimeout(() => setMensaje(null), 3000);
      }
    } catch {
      setMensaje({
        tipo: "error",
        texto: "No se pudo conectar con el servidor.",
      });
      setTimeout(() => setMensaje(null), 3000);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="ins-formulario-container">
      <div className="ins-form-header">
        <img
          src={logoApk}
          alt="Desviaciones"
          style={{ height: "42px", width: "auto", objectFit: "contain" }}
        />
        <button
          className="ins-btn-finalizar"
          onClick={handleFinalizarReporte}
          disabled={enviando}
        >
          {enviando ? <Loader2 size={14} className="spinner" /> : null}
          <Save size={20} />
          Finalizar Muestreo
        </button>
        <div className="ins-articulo-nombre">
          {articuloSeleccionado?.cod_art} - {articuloSeleccionado?.desc_art}
        </div>
        <button className="ins-btn-cambiar" onClick={handleCambiarArticulo}>
          Cambiar Artículo
        </button>
      </div>

      {mensaje && (
        <div className={`ins-toast ${mensaje.tipo}`}>
          {mensaje.tipo === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="ins-form-body">
        <div className="ins-muestra-row">
          <label className="ins-muestra-label">Muestra N°</label>
          <span className="ins-muestra-numero">{muestraActual}</span>
          {desviacionSeleccionada && (
            <span
              className="ins-sel-tag categoria"
              onClick={() => {
                setDesviacionSeleccionada(null);
                setCausaSeleccionada(null);
              }}
              title="Cambiar motivo desviación"
            >
              {desviacionSeleccionada.motivo_desviacion}
            </span>
          )}
          {causaSeleccionada && (
            <span
              className="ins-sel-tag causa"
              onClick={() => setCausaSeleccionada(null)}
              title="Cambiar motivo causa"
            >
              {causaSeleccionada.descr}
            </span>
          )}
        </div>

        <div className="ins-categorias-area">
          {fase === "desviaciones" && (
            <>
              <p className="ins-seleccione-label">
                Seleccione un motivo desviación
              </p>
              {cargandoDesviaciones ? (
                <div className="ins-lista-loading">
                  <Loader2 size={20} className="spinner" /> Cargando
                  desviaciones...
                </div>
              ) : desviacionesDisponibles.length === 0 ? (
                <p className="ins-lista-vacia">
                  No hay desviaciones asociadas a este artículo
                </p>
              ) : (
                <div className="ins-grid">
                  {desviacionesDisponibles.map((desv) => (
                    <button
                      key={desv.cod_pregunta || desv.motivo_desviacion}
                      className="ins-grid-btn"
                      onClick={() => handleSeleccionarDesviacion(desv)}
                    >
                      {desv.motivo_desviacion}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {fase === "causas" &&
            (() => {
              const categoriasUnicas = Array.from(
                new Set(
                  causasDisponibles.map((c) =>
                    c.categoria ? c.categoria.trim() : "General",
                  ),
                ),
              );
              const causasFiltradas =
                categoriaCausaActiva && categoriaCausaActiva !== "TODAS"
                  ? causasDisponibles.filter(
                      (c) =>
                        (c.categoria ? c.categoria.trim() : "General") ===
                        categoriaCausaActiva,
                    )
                  : causasDisponibles;

              return (
                <>
                  <p className="ins-seleccione-label">
                    Seleccione una categoría y motivo causa
                  </p>
                  {categoriasUnicas.length > 0 && (
                    <div className="ins-tabs-categorias">
                      <button
                        className={`ins-tab-btn ${categoriaCausaActiva === "TODAS" ? "activa" : ""}`}
                        onClick={() => setCategoriaCausaActiva("TODAS")}
                      >
                        Todas
                      </button>
                      {categoriasUnicas.map((cat) => (
                        <button
                          key={cat}
                          className={`ins-tab-btn ${categoriaCausaActiva === cat ? "activa" : ""}`}
                          onClick={() => setCategoriaCausaActiva(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                  {causasFiltradas.length === 0 ? (
                    <p className="ins-lista-vacia">
                      No hay causas disponibles en esta categoría
                    </p>
                  ) : (
                    <div className="ins-grid">
                      {causasFiltradas.map((causa) => (
                        <button
                          key={causa.cod_mcd || causa.descr}
                          className={`ins-grid-btn ${causaSeleccionada?.cod_mcd === causa.cod_mcd ? "seleccionada" : ""}`}
                          onClick={() => handleSeleccionarCausa(causa)}
                        >
                          {causa.descr}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
        </div>

        {/* ── Botón Sin Defecto (solo visible en la fase de desviaciones) ── */}
        {fase === "desviaciones" && (
          <button className="ins-btn-sin-defecto" onClick={handleSinDefecto}>
            <Check size={24} strokeWidth={3} /> Sin Defecto
          </button>
        )}
      </div>

      {/* ══ MODAL DE CONFIRMACIÓN ══ */}
      {mostrarConfirm && (
        <div className="ins-modal-overlay">
          <div className="ins-modal-card">
            <h3>Confirmar Muestra</h3>
            <p>
              ¿Desea registrar la <strong>Muestra N° {muestraActual}</strong>{" "}
              {causaSeleccionada ? (
                <>
                  con la desviación:{" "}
                  <strong>{desviacionSeleccionada?.motivo_desviacion}</strong> -{" "}
                  <strong>{causaSeleccionada.descr}</strong>?
                </>
              ) : (
                <>
                  <strong>Sin Defecto</strong>?
                </>
              )}
            </p>
            <div className="ins-modal-acciones">
              <button
                className="ins-modal-no"
                onClick={() => {
                  setMostrarConfirm(false);
                  setCausaSeleccionada(null);
                }}
              >
                Cancelar
              </button>
              <button className="ins-modal-yes" onClick={confirmarGuardar}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL DE CONFIRMACIÓN DE FINALIZAR REPORTE ══ */}
      {confirmarFinalizar && (
        <div className="ins-modal-overlay">
          <div className="ins-modal-card">
            <h3>Finalizar Reporte</h3>
            <p>
              ¿Desea finalizar el reporte para este artículo? Se registrarán{" "}
              <strong>{muestrasActuales.length}</strong> muestras en total.
            </p>
            <div className="ins-modal-acciones">
              <button
                className="ins-modal-no"
                onClick={() => setConfirmarFinalizar(false)}
              >
                Cancelar
              </button>
              <button
                className="ins-modal-yes"
                onClick={limpiarDatosInspeccion}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══ MODAL DE CONFIRMACIÓN DE CAMBIAR ARTÍCULO ══ */}
      {confirmarCambiarArticulo && (
        <div className="ins-modal-overlay">
          <div className="ins-modal-card">
            <h3>¿Cambiar de Artículo?</h3>
            {muestrasGuardadas.length > 0 ? (
              <>
                <p>
                  Tiene <strong>{muestrasGuardadas.length}</strong> muestras
                  registradas para este artículo. ¿Desea guardar este reporte
                  antes de cambiar?
                </p>
                <div className="ins-modal-acciones vertical">
                  <button
                    className="ins-modal-yes"
                    onClick={() => {
                      setConfirmarCambiarArticulo(false);
                      ejecutarFinalizarReporte("cambiarArticulo");
                    }}
                  >
                    Guardar y Cambiar
                  </button>
                  <button
                    className="ins-modal-no descartar"
                    onClick={() => {
                      setConfirmarCambiarArticulo(false);
                      onCambiarArticulo();
                    }}
                  >
                    Descartar y Cambiar
                  </button>
                  <button
                    className="ins-modal-no"
                    onClick={() => setConfirmarCambiarArticulo(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  Se perderá la selección actual. ¿Desea cambiar de artículo?
                </p>
                <div className="ins-modal-acciones">
                  <button
                    className="ins-modal-no"
                    onClick={() => setConfirmarCambiarArticulo(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="ins-modal-yes"
                    onClick={() => {
                      setConfirmarCambiarArticulo(false);
                      onCambiarArticulo();
                    }}
                  >
                    Descartar y Cambiar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
