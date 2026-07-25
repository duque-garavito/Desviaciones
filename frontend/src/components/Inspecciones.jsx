import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { Search, Loader2, CheckCircle2, AlertCircle, Package, ChevronRight, Check, Save } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './Inspecciones.css';


/* ════════════════════════════════════════════════
   PANTALLA 1 – Selección de Artículo
════════════════════════════════════════════════ */
function PantallaSeleccionArticulo({ onSeleccionar, codArea }) {
  const [busqueda, setBusqueda] = useState('');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Cargar catálogo inicial solo al montar o cambiar de área
  useEffect(() => {
    buscarArticulos('');
  }, [codArea]);

  const buscarArticulos = async (termino) => {
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (termino && termino.trim().length >= 2) params.set('buscar', termino.trim());
      if (codArea) params.set('cod_as', String(codArea).trim());
      const res = await fetch(`${API_BASE_URL}/api/inspecciones/articulos?${params.toString()}`);
      const data = await res.json();
      setLista(data.success ? (data.articulos || []) : []);
    } catch {
      setLista([]);
    } finally {
      setCargando(false);
    }
  };

  // Debounce solo cuando hay 2 o más caracteres. Al borrar todo (< 2), NO busca nada.
  useEffect(() => {
    const txt = busqueda.trim();
    if (txt.length < 2) return;

    const timer = setTimeout(() => {
      buscarArticulos(txt);
    }, 700);

    return () => clearTimeout(timer);
  }, [busqueda]);

  const handleBusquedaChange = (valor) => {
    setBusqueda(valor);
  };

  return (
    <div className="ins-pantalla-articulo">
      {/* Encabezado elegante */}
      <div className="ins-articulo-header">
        <div className="ins-header-info">
          <div className="ins-header-icon-badge">
            <Package size={22} />
          </div>
          <div>
            <h2 className="ins-header-title">Selección de Artículo</h2>
          </div>
        </div>
      </div>

      {/* Buscador de alto impacto */}
      <div className="ins-buscador-wrapper">
        <Search size={20} className="ins-buscar-icon" />
        <input
          type="text"
          className="ins-buscar-input"
          placeholder="Buscar por código, nombre o descripción del artículo..."
          value={busqueda}
          onChange={e => handleBusquedaChange(e.target.value)}
        />
        {busqueda && (
          <button
            type="button"
            className="ins-clear-btn"
            onClick={() => handleBusquedaChange('')}
            title="Limpiar búsqueda"
          >
            &times;
          </button>
        )}

      </div>

      {/* Contador de resultados */}
      {!cargando && lista.length > 0 && (
        <div className="ins-resultados-count">
          <span>Catálogo de artículos ({lista.length})</span>
        </div>
      )}

      {/* Lista de artículos estilizada */}
      <div className="ins-articulo-lista">
        {cargando ? (
          <div className="ins-lista-loading">
            <Loader2 size={24} className="spinner" />
            <span>Cargando artículos disponibles...</span>
          </div>
        ) : lista.length === 0 ? (
          <div className="ins-lista-vacia">
            <Package size={36} className="ins-vacia-icon" />
            <p>{busqueda ? 'No se encontraron artículos con ese término' : 'No hay artículos registrados'}</p>
          </div>
        ) : (
          lista.map((art, idx) => {
            const codArt = art.cod_art || art.COD_ART || '';
            const nomArt = art.nom_articulo || art.NOM_ARTICULO || art.desc_art || art.DESC_ART || '';
            const descSubCat = art.desc_sub_cat || art.DESC_SUB_CAT || '';
            const descEtiqueta = art.desc_etiqueta || art.DESC_ETIQUETA || '';
            return (
              <div
                key={codArt || idx}
                className="ins-articulo-item"
                onClick={() => onSeleccionar(art)}
              >
                <div className="ins-art-content">
                  <div className="ins-art-row-top">
                    <span className="ins-art-cod">{codArt}</span>
                    {descSubCat && (
                      <span className="ins-art-subcat">{descSubCat}</span>
                    )}
                  </div>
                  <div className="ins-art-nom">{nomArt}</div>
                  {descEtiqueta && (
                    <div className="ins-art-desc">{descEtiqueta}</div>
                  )}
                </div>
                <ChevronRight size={18} className="ins-art-arrow" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   PANTALLA 2 – Formulario de inspección (muestra a muestra)
════════════════════════════════════════════════ */
function PantallaFormulario({
  articulo,
  conteoMuestra,
  formularioInfo,
  preguntas,
  usuario,
  onFinalizar,
  onCambiarArticulo
}) {
  const [muestraActual, setMuestraActual] = useState(1);
  const [desviacionSeleccionada, setDesviacionSeleccionada] = useState(null);
  const [causaSeleccionada, setCausaSeleccionada] = useState(null);

  const [muestrasGuardadas, setMuestrasGuardadas] = useState([]);

  const [desviacionesDisponibles, setDesviacionesDisponibles] = useState([]);
  const [cargandoDesviaciones, setCargandoDesviaciones] = useState(false);

  const [causasDisponibles, setCausasDisponibles] = useState([]);
  const [cargandoCausas, setCargandoCausas] = useState(false);
  const [categoriaCausaActiva, setCategoriaCausaActiva] = useState('TODAS');

  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false);
  const [confirmarCambiarArticulo, setConfirmarCambiarArticulo] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    const cargarDesviaciones = async () => {
      if (!articulo) return;
      setCargandoDesviaciones(true);
      try {
        const params = new URLSearchParams();
        if (formularioInfo?.cod_area) params.set('cod_as', formularioInfo.cod_area);
        if (articulo?.COD_ART) params.set('cod_art', String(articulo.COD_ART).trim());

        const res = await fetch(`${API_BASE_URL}/api/inspecciones/desviaciones-articulo?${params.toString()}`);
        const data = await res.json();
        if (data.success) setDesviacionesDisponibles(data.desviaciones || []);
      } catch {
        setDesviacionesDisponibles([]);
      } finally {
        setCargandoDesviaciones(false);
      }
    };
    cargarDesviaciones();
  }, [articulo, formularioInfo]);

  useEffect(() => {
    const cargarCausas = async () => {
      if (!articulo) return;
      setCargandoCausas(true);
      try {
        const params = new URLSearchParams();
        if (formularioInfo?.cod_reporte) params.set('cod_reporte', formularioInfo.cod_reporte);
        if (formularioInfo?.cod_area) params.set('cod_as', formularioInfo.cod_area);
        if (articulo?.SUB_CAT_ART) params.set('cod_sub_cat', String(articulo.SUB_CAT_ART).trim());
        if (articulo?.COD_ART) params.set('cod_art', String(articulo.COD_ART).trim());

        const res = await fetch(`${API_BASE_URL}/api/inspecciones/causas-desviacion?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          const causas = data.causas || [];
          setCausasDisponibles(causas);
          if (causas.length > 0 && causas[0].categoria) {
            setCategoriaCausaActiva(causas[0].categoria.trim());
          } else {
            setCategoriaCausaActiva('TODAS');
          }
        }
      } catch {
        setCausasDisponibles([]);
      } finally {
        setCargandoCausas(false);
      }
    };
    cargarCausas();
  }, [articulo, formularioInfo]);

  const fase = !desviacionSeleccionada ? 'desviaciones' : 'causas';

  const handleSeleccionarDesviacion = (desv) => {
    setDesviacionSeleccionada(desv);
    setCausaSeleccionada(null);
  };

  const handleSeleccionarCausa = (causa) => {
    setCausaSeleccionada(causa);
    setMostrarConfirm(true);
  };

  const confirmarGuardar = () => {
    if (causaSeleccionada) {
      const muestra = {
        nro: muestraActual,
        desviacionLabel: desviacionSeleccionada?.motivo_desviacion || '',
        desviacionCod: desviacionSeleccionada?.cod_pregunta || '',
        causaLabel: causaSeleccionada?.descr || '',
        causaCod: causaSeleccionada?.cod_mcd || '',
        causaSubCat: causaSeleccionada?.cod_sub_cat || '',
        causaEspeci: causaSeleccionada?.cod_especi || '',
        sinDefecto: false
      };
      setMuestrasGuardadas(prev => [...prev, muestra]);
    } else {
      const muestra = {
        nro: muestraActual,
        desviacionLabel: null,
        desviacionCod: null,
        causaLabel: null,
        causaCod: null,
        causaSubCat: null,
        causaEspeci: null,
        sinDefecto: true
      };
      setMuestrasGuardadas(prev => [...prev, muestra]);
    }
    setMostrarConfirm(false);
    resetMuestra();
  };

  const handleSinDefecto = () => {
    setDesviacionSeleccionada(null);
    setCausaSeleccionada(null);
    setMostrarConfirm(true);
  };

  const resetMuestra = () => {
    setMuestraActual(prev => prev + 1);
    setDesviacionSeleccionada(null);
    setCausaSeleccionada(null);
  };

  const handleFinalizarReporte = () => {
    if (muestrasGuardadas.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Registre al menos una muestra antes de finalizar.' });
      setTimeout(() => setMensaje(null), 3000);
      return;
    }
    setConfirmarFinalizar(true);
  };
  const handleCambiarArticulo = () => {
    if (muestrasGuardadas.length > 0 || desviacionSeleccionada || causaSeleccionada) {
      setConfirmarCambiarArticulo(true);
    } else {
      onCambiarArticulo();
    }
  };

  const ejecutarFinalizarReporte = async (afterAction = 'finalizar') => {
    setConfirmarFinalizar(false);
    setEnviando(true);
    try {
      const horaFin = new Date().toISOString();
      const muestrasConDesvio = muestrasGuardadas.filter(m => !m.sinDefecto);
      const totalDesvios = muestrasConDesvio.length;
      const totalSinDefecto = muestrasGuardadas.filter(m => m.sinDefecto).length;

      const respuestasArray = preguntas.map(p => {
        const desviosDeEstaPregunta = muestrasConDesvio.filter(m => m.desviacionCod === p.id || m.desviacionLabel === p.texto);
        const countDesvios = desviosDeEstaPregunta.length;

        if (p.tipo_campo === 'N' || countDesvios > 0) {
          let respVarchar = null;
          if (countDesvios > 0) {
            const serialized = desviosDeEstaPregunta.map(m =>
              `Muestra ${m.nro}: ${m.desviacionLabel} - ${m.causaLabel} (Cant: 1)`
            ).join(' | ');
            respVarchar = `Causas: ${serialized}`;
          }
          return {
            cod_pregunta: p.id,
            resp_char: null,
            resp_number: countDesvios,
            resp_varchar: respVarchar,
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
          resp_varchar: p.tipo_campo === 'V' ? '' : null,
          causas: []
        };
      });

      const res = await fetch(`${API_BASE_URL}/api/inspecciones/guardar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cod_rv: formularioInfo?.cod_rv,
          nro_ref: articulo?.COD_ART,
          cod_usr: usuario?.id,
          conteo_muestra: conteoMuestra || String(muestrasGuardadas.length),
          total_desvios: totalDesvios,
          total_sin_defecto: totalSinDefecto,
          respuestas: respuestasArray,
          hora_inicio: new Date().toISOString(),
          hora_fin: horaFin
        })
      });
      const data = await res.json();
      if (data.success) {
        setMensaje({ tipo: 'success', texto: '¡Reporte guardado correctamente!' });
        setTimeout(() => {
          setMensaje(null);
          if (afterAction === 'cambiarArticulo') {
            onCambiarArticulo();
          } else {
            onFinalizar();
          }
        }, 2000);
      } else {
        setMensaje({ tipo: 'error', texto: data.message || 'Error al guardar.' });
        setTimeout(() => setMensaje(null), 3000);
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
      setTimeout(() => setMensaje(null), 3000);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="ins-formulario-container">
      <div className="ins-form-header">
        <button className="ins-btn-finalizar" onClick={handleFinalizarReporte} disabled={enviando}>
          {enviando ? <Loader2 size={14} className="spinner" /> : null}
          <Save size={20} />Finalizar Reporte
        </button>
        <div className="ins-articulo-nombre">
          {articulo?.COD_ART} {articulo?.NOM_ARTICULO ? `- ${articulo.NOM_ARTICULO}` : ''}
          <span className="ins-articulo-descripcion">{articulo?.DESC_ETIQUETA}</span>
        </div>
        <button className="ins-btn-cambiar" onClick={handleCambiarArticulo}>
          Cambiar Artículo
        </button>
      </div>

      {mensaje && (
        <div className={`ins-toast ${mensaje.tipo}`}>
          {mensaje.tipo === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
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
              onClick={() => { setDesviacionSeleccionada(null); setCausaSeleccionada(null); }}
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
          {fase === 'desviaciones' && (
            <>
              <p className="ins-seleccione-label">Seleccione un motivo desviación</p>
              {cargandoDesviaciones ? (
                <div className="ins-lista-loading">
                  <Loader2 size={20} className="spinner" /> Cargando desviaciones...
                </div>
              ) : desviacionesDisponibles.length === 0 ? (
                <p className="ins-lista-vacia">No hay desviaciones asociadas a este artículo</p>
              ) : (
                <div className="ins-grid">
                  {desviacionesDisponibles.map(desv => (
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

          {fase === 'causas' && (() => {
            const categoriasUnicas = Array.from(
              new Set(causasDisponibles.map(c => c.categoria ? c.categoria.trim() : 'General'))
            );
            const causasFiltradas = categoriaCausaActiva && categoriaCausaActiva !== 'TODAS'
              ? causasDisponibles.filter(c => (c.categoria ? c.categoria.trim() : 'General') === categoriaCausaActiva)
              : causasDisponibles;

            return (
              <>
                <p className="ins-seleccione-label">Seleccione una categoría y motivo causa</p>
                
                {categoriasUnicas.length > 0 && (
                  <div className="ins-tabs-categorias">
                    <button
                      className={`ins-tab-btn ${categoriaCausaActiva === 'TODAS' ? 'activa' : ''}`}
                      onClick={() => setCategoriaCausaActiva('TODAS')}
                    >
                      Todas
                    </button>
                    {categoriasUnicas.map(cat => (
                      <button
                        key={cat}
                        className={`ins-tab-btn ${categoriaCausaActiva === cat ? 'activa' : ''}`}
                        onClick={() => setCategoriaCausaActiva(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {cargandoCausas ? (
                  <div className="ins-lista-loading">
                    <Loader2 size={20} className="spinner" /> Cargando causas...
                  </div>
                ) : causasFiltradas.length === 0 ? (
                  <p className="ins-lista-vacia">No hay causas disponibles en esta categoría</p>
                ) : (
                  <div className="ins-grid">
                    {causasFiltradas.map(causa => (
                      <button
                        key={causa.cod_mcd || causa.descr}
                        className={`ins-grid-btn ${causaSeleccionada?.cod_mcd === causa.cod_mcd ? 'seleccionada' : ''}`}
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
        {fase === 'desviaciones' && (
          <button
            className="ins-btn-sin-defecto"
            onClick={handleSinDefecto}
          >
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
              ¿Desea registrar la <strong>Muestra N° {muestraActual}</strong>{' '}
              {causaSeleccionada ? (
                <>con la desviación: <strong>{desviacionSeleccionada?.motivo_desviacion}</strong> - <strong>{causaSeleccionada.descr}</strong>?</>
              ) : (
                <><strong>Sin Defecto</strong>?</>
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
              ¿Desea finalizar el reporte para este artículo? Se registrarán{' '}
              <strong>{muestrasGuardadas.length}</strong> muestras en total.
            </p>
            <div className="ins-modal-acciones">
              <button
                className="ins-modal-no"
                onClick={() => setConfirmarFinalizar(false)}
              >
                Cancelar
              </button>
              <button className="ins-modal-yes" onClick={ejecutarFinalizarReporte}>
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
                  Tiene <strong>{muestrasGuardadas.length}</strong> muestras registradas para este artículo. ¿Desea guardar este reporte antes de cambiar?
                </p>
                <div className="ins-modal-acciones vertical">
                  <button
                    className="ins-modal-yes"
                    onClick={() => {
                      setConfirmarCambiarArticulo(false);
                      ejecutarFinalizarReporte('cambiarArticulo');
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

/* ════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════ */
function Inspecciones({ usuario }) {
  const navigate = useNavigate();

  // pantalla: 'inicio' | 'seleccion' | 'formulario'
  const [pantalla, setPantalla] = useState('seleccion');
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [confirmarArticulo, setConfirmarArticulo] = useState(null);
  const [conteoMuestra, setConteoMuestra] = useState('');
  const [formularioInfo, setFormularioInfo] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Cargar formulario del inspector al montar
  useEffect(() => {
    const cargar = async () => {
      if (!usuario?.id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/inspecciones/formulario-hoy/${usuario.id}`);
        const data = await res.json();
        if (data.success) {
          setFormularioInfo({
            nombre: data.formulario,
            area: data.area,
            cod_area: data.cod_area,
            turno: data.turno,
            version: `v${data.version}`,
            cod_rv: data.cod_rv,
            cod_reporte: data.cod_reporte
          });
          setPreguntas(data.preguntas || []);
        } else {
          // Sin programación, el inspector puede continuar
          console.warn('Sin programación activa:', data.message);
        }
      } catch (err) {
        console.error('Error cargando formulario:', err);
        const urlDestino = `${API_BASE_URL}/api/inspecciones/formulario-hoy/${usuario?.id}`;
        const redStatus = navigator.onLine ? "Red activa" : "Sin conexión Wi-Fi";
        const detalleError = [
          `URL: ${urlDestino}`,
          `Error: ${err?.name || 'Error'} - ${err?.message || String(err)}`,
          `Estado Red: ${redStatus}`
        ].join('\n\n');
        alert(`⚠️ Error en Inspecciones:\n\n${detalleError}`);
        setError('No se pudo conectar con el servidor.');
          } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [usuario]);

  const handleIniciarReporte = () => setPantalla('seleccion');

  const handleSeleccionarArticulo = (art) => {
    setConfirmarArticulo(art);
  };

  const confirmarInicioInspeccion = async (art) => {
    setConfirmarArticulo(null);
    setArticuloSeleccionado(art);

    let currentFormInfo = formularioInfo;

    // Recargar preguntas del formulario si el artículo define especie específica
    if (art.ESPECIE && usuario?.id) {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('especie', String(art.ESPECIE).trim());
        const res = await fetch(`${API_BASE_URL}/api/inspecciones/formulario-hoy/${usuario.id}?${queryParams.toString()}`);
        const data = await res.json();
        if (data.success && data.preguntas) {
          currentFormInfo = {
            nombre: data.formulario,
            area: data.area,
            cod_area: data.cod_area,
            turno: data.turno,
            version: `v${data.version}`,
            cod_rv: data.cod_rv,
            cod_reporte: data.cod_reporte
          };
          setFormularioInfo(currentFormInfo);
          setPreguntas(data.preguntas || []);
        }
      } catch (err) {
        console.error('Error al cargar preguntas por especie de artículo:', err);
      }
    }

    setPantalla('formulario');
  };

  const handleCambiarArticulo = () => {
    setArticuloSeleccionado(null);
    setPantalla('seleccion');
  };

  const handleFinalizar = () => {
    setArticuloSeleccionado(null);
    setConteoMuestra('');
    setPantalla('seleccion');
  };

  return (
    <Layout usuario={usuario}>
      <div className="inspecciones-container">
        {cargando ? (
          <div className="ins-cargando">
            <Loader2 size={40} className="spinner" />
            <p>Cargando formulario...</p>
          </div>
        ) : error ? (
          <div className="ins-error">
            <AlertCircle size={40} />
            <p>{error}</p>
            <button onClick={() => navigate('/registros')}>Ver Registros</button>
          </div>
        ) : pantalla === 'inicio' ? (
          <PantallaInicio onIniciar={handleIniciarReporte} />
        ) : pantalla === 'seleccion' ? (
          <>
            <PantallaSeleccionArticulo
              onSeleccionar={handleSeleccionarArticulo}
              codArea={formularioInfo?.cod_area}
            />
            {confirmarArticulo && (
              <div className="ins-modal-overlay">
                <div className="ins-modal-card">
                  <h3>Iniciar Inspección</h3>
                  <p>
                    ¿Desea iniciar la inspección para el artículo:{' '}
                    <strong>
                      {confirmarArticulo.COD_ART} {confirmarArticulo.NOM_ARTICULO ? `- ${confirmarArticulo.NOM_ARTICULO}` : ''}
                    </strong>?
                  </p>
                  <div className="ins-modal-acciones">
                    <button
                      className="ins-modal-no"
                      onClick={() => setConfirmarArticulo(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="ins-modal-yes"
                      onClick={() => confirmarInicioInspeccion(confirmarArticulo)}
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <PantallaFormulario
            articulo={articuloSeleccionado}
            conteoMuestra={conteoMuestra}
            formularioInfo={formularioInfo}
            preguntas={preguntas}
            usuario={usuario}
            onFinalizar={handleFinalizar}
            onCambiarArticulo={handleCambiarArticulo}
          />
        )}
      </div>
    </Layout>
  );
}

export default Inspecciones;
