import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logoApk from "../../assets/images/logo apk desviaciones.png";
import { Loader2, CheckCircle2, AlertCircle, Check, Save } from "lucide-react";
import { useDesviacion } from "../../core/Context/DesviacionContext";
import { useAuth } from "../../core/Context/AuthContext";
import {
  obtenterCausas,
  obtenterDesviaciones,
  SaveDesviacion,
} from "../../core/services/Desviacion.service";

import FormTexto from "./FormTexto";

export default function Formulario() {
  const navigate = useNavigate();
  const {
    articuloSeleccionado,
    reporteGenerado,
    limpiarArticulo,
    muestrasActuales,
    asignarMuestras,
    finalizarInspeccion,
    datosGenerales,
  } = useDesviacion();
  const { usuarioActual, areaActiva, turnoActual, limpiarArea } = useAuth();
  // Separar preguntas tipo V (texto) de las numéricas/binarias
  // const preguntasMuestreo = preguntas.filter(p => p.tipo_campo !== 'V');

  const [muestraActual, setMuestraActual] = useState(
    muestrasActuales.length + 1,
  );
  const [desviacionSeleccionada, setDesviacionSeleccionada] = useState(null);
  const [causaSeleccionada, setCausaSeleccionada] = useState(null);

  const [desviacionesNumericas, setDesviacionesNumericas] = useState([]);
  const [desviacionesTexto, setDesviacionesTexto] = useState([]);

  // const [desviacionesDisponibles, setDesviacionesDisponibles] = useState([]);
  const [cargandoDesviaciones, setCargandoDesviaciones] = useState(false);

  const [causasDisponibles, setCausasDisponibles] = useState([]);
  const [categoriaCausaActiva, setCategoriaCausaActiva] = useState("TODAS");

  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const [verGeneral, setVerGeneral] = useState(!datosGenerales);

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

  const confirmarFinalizacionReporte = () => {
    finalizarInspeccion();
    limpiarArea();
    navigate("/dashboard", { replace: true });
  };

  const handleVerGeneral = () => {
    setVerGeneral(!verGeneral);
  };

  useEffect(() => {
    const cargarDesviaciones = async () => {
      if (!articuloSeleccionado) return;

      setCargandoDesviaciones(true);

      try {
        const params = new URLSearchParams();
        const codArea = areaActiva?.cod_as || areaActiva?.codArea || areaActiva?.COD_AS || turnoActual?.codArea || "";
        params.set("cod_as", String(codArea).trim());

        // params.set("cod_art", String(articuloSeleccionado.cod_art).trim());
        const subCatVal = articuloSeleccionado?.sub_cat_art;
        if (subCatVal) {
          params.set("cod_sub_cat", String(subCatVal).trim());
        }

        const [peticion, peticion2] = await Promise.all([
          obtenterDesviaciones(params),
          obtenterCausas(subCatVal),
        ]);

        if ("error" in peticion) {
          // setDesviacionesDisponibles([]);
          setDesviacionesNumericas([]);
          setDesviacionesTexto([]);
          return;
        }

        const desviacionNum = peticion.desviaciones.filter(
          (des) => des.tipo_campo === "N",
        );
        const desviacionTexto = peticion.desviaciones.filter(
          (des) => des.tipo_campo === "V",
        );
        setDesviacionesNumericas(desviacionNum);
        setDesviacionesTexto(desviacionTexto);

        if ("error" in peticion2) {
          setCausasDisponibles([]);
          return;
        }

        // setDesviacionesDisponibles(peticion.desviaciones);
        setCausasDisponibles(peticion2.causas);
      } catch (error) {
        console.log(error);
        // setDesviacionesDisponibles([]);
        setDesviacionesNumericas([]);
        setDesviacionesTexto([]);
      } finally {
        setCargandoDesviaciones(false);
      }
    };
    cargarDesviaciones();
  }, []);

  return (
    <div className="ins-formulario-container">
      <div className="ins-form-header">
        {/* <img
          src={logoApk}
          alt="Desviaciones"
          style={{ height: "42px", width: "auto", objectFit: "contain" }}
        /> */}

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

      {desviacionesTexto.length > 0 && verGeneral ? (
        <FormTexto
          preguntasTexto={desviacionesTexto}
          handleVerGeneral={handleVerGeneral}
        />
      ) : (
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

            {datosGenerales && !verGeneral && (
              <button className="ins-btn-cambiar" onClick={handleVerGeneral}>
                Ver Datos Generales
              </button>
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
                ) : desviacionesNumericas.length === 0 ? (
                  <p className="ins-lista-vacia">
                    No hay desviaciones asociadas a este artículo
                  </p>
                ) : (
                  <div className="ins-grid">
                    {desviacionesNumericas.map((desv) => (
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
      )}

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
                onClick={confirmarFinalizacionReporte}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══ MODAL DE CONFIRMACIÓN DE CAMBIAR ARTÍCULO ══ */}
      {/* {confirmarCambiarArticulo && (
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
      )} */}
    </div>
  );
}
