import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { Search, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Package, ChevronRight, Check, Save } from 'lucide-react';
import { API_BASE_URL } from '../config';
import fishLogo from '../assets/images/fishlogo.png';
import logoApk from '../assets/images/logo apk desviaciones.png';
import './Inspecciones.css';


/* ════════════════════════════════════════════════
   PANTALLA 1 – Selección de Artículo
════════════════════════════════════════════════ */
function PantallaSeleccionArticulo({ onSeleccionar, codArea }) {
  const [busqueda, setBusqueda] = useState('');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Cargar catálogo inicial solo al montar o cambiar de área
/*   useEffect(() => {
    buscarArticulos('');
  }, []); */

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
   // if (txt.length < 2) return;

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
          <img src={logoApk} alt="Logo Desviaciones" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
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
   PANTALLA 1b – Campos de texto (solo Recepción)
════════════════════════════════════════════════ */
function PantallaCamposTexto({ preguntasTexto, onConfirmar, onCancelar }) {
  const [valores, setValores] = useState(() => {
    const init = {};
    preguntasTexto.forEach(p => { init[p.id] = ''; });
    return init;
  });
  const [focusedId, setFocusedId] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (id, val) => {
    setValores(prev => ({ ...prev, [id]: val }));
    if (error) setError(null);
  };

  const handleConfirmar = () => {
    const vacios = preguntasTexto.filter(p => !valores[p.id]?.trim());
    if (vacios.length > 0) {
      setError(`Complete el campo: ${vacios[0].texto}`);
      return;
    }
    setError(null);
    onConfirmar(valores);
  };

  return (
    <div className="ins-pantalla-articulo">
      <div className="ins-articulo-header">
        <div className="ins-header-info">
          <div className="ins-header-icon-badge">
            <Save size={22} />
          </div>
          <div>
            <h2 className="ins-header-title">Datos de Recepción</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
              Complete todos los campos antes de iniciar el muestreo
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '600px', width: '100%' }}>
        {preguntasTexto.map(p => {
          const isFocused = focusedId === p.id;
          const hasValue = Boolean(valores[p.id]?.trim());
          return (
            <div key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{
                  fontWeight: '700',
                  fontSize: '12px',
                  color: isFocused ? '#3b82f6' : 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  transition: 'color 0.2s'
                }}>
                  {p.texto} <span style={{ color: '#ef4444' }}>*</span>
                </label>
              </div>
              <input
                type="text"
                value={valores[p.id] || ''}
                onChange={e => handleChange(p.id, e.target.value)}
                placeholder={`Ingrese ${p.texto.toLowerCase()}...`}
                onFocus={() => setFocusedId(p.id)}
                onBlur={() => setFocusedId(null)}
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${isFocused ? '#3b82f6' : hasValue ? '#93c5fd' : 'var(--border-color, #e2e8f0)'}`,
                  background: isFocused ? '#eff6ff' : hasValue ? '#eff6ff' : 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  fontWeight: '500',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  boxShadow: isFocused ? '0 0 0 4px rgba(59,130,246,0.12)' : 'none'
                }}
              />
            </div>
          );
        })}

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1.5px solid #fca5a5',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#dc2626',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button
            className="ins-modal-no"
            style={{ flex: 1, padding: '13px' }}
            onClick={onCancelar}
          >
            ← Volver
          </button>
          <button
            className="ins-modal-yes"
            style={{ flex: 2, padding: '13px', fontSize: '15px' }}
            onClick={handleConfirmar}
          >
            Continuar al Muestreo →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   PANTALLA 2 – Formulario de inspección (muestra a muestra)
════════════════════════════════════════════════ */
function PantallaFormulario({
  articulo,
  codRepC,
  conteoMuestra,
  formularioInfo,
  preguntas,
  camposTextoValues,
  usuario,
  onFinalizar,
  onCambiarArticulo,
  draftRestaurado,
  alertaRestauracion
}) {
  // Separar preguntas tipo V (texto) de las numéricas/binarias
  const preguntasMuestreo = preguntas.filter(p => p.tipo_campo !== 'V');

  const [muestraActual, setMuestraActual] = useState(() => draftRestaurado?.muestraActual || 1);
  const [desviacionSeleccionada, setDesviacionSeleccionada] = useState(null);
  const [causaSeleccionada, setCausaSeleccionada] = useState(null);

  const [muestrasGuardadas, setMuestrasGuardadas] = useState(() => draftRestaurado?.muestrasGuardadas || []);

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

  // Auto-guardar borrador local Y sincronizar en BD de Oracle ante cualquier cambio en las muestras
  useEffect(() => {
    if (articulo && usuario?.id && muestrasGuardadas.length > 0) {
      try {
        const draftObj = {
          articulo,
          codRepC,
          conteoMuestra,
          formularioInfo,
          preguntas,
          camposTextoValues,
          muestraActual,
          muestrasGuardadas,
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
  }, [muestrasGuardadas, codRepC, articulo, usuario, conteoMuestra, formularioInfo, preguntas, camposTextoValues, muestraActual]);

  useEffect(() => {
    const cargarDesviaciones = async () => {
      if (!articulo) return;
      setCargandoDesviaciones(true);
      try {
        const params = new URLSearchParams();
        if (formularioInfo?.cod_area) params.set('cod_as', formularioInfo.cod_area);
        if (articulo?.COD_ART) params.set('cod_art', String(articulo.COD_ART).trim());
        const subCatVal = articulo?.SUB_CAT_ART || articulo?.SUB_CAT || articulo?.COD_SUBCAT;
        if (subCatVal) params.set('cod_sub_cat', String(subCatVal).trim());

        const res = await fetch(`${API_BASE_URL}/api/inspecciones/desviaciones-articulo?${params.toString()}`);
        const data = await res.json();
        // Solo devolver desviaciones que correspondan a preguntas de muestreo (tipo N)
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

      // Construir respuestas: primero los campos de texto (tipo V) con sus valores ya ingresados
      const preguntasTexto = preguntas.filter(p => p.tipo_campo === 'V');
      const respuestasTexto = preguntasTexto.map(p => ({
        cod_pregunta: p.id,
        resp_char: null,
        resp_number: null,
        resp_varchar: (camposTextoValues && camposTextoValues[p.id]) ? camposTextoValues[p.id].trim() : null,
        causas: []
      }));

      // Luego las respuestas del muestreo (tipo N/B)
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

      const respuestasArray = [...respuestasTexto, ...respuestasMuestreo];

      let res;
      if (codRepC) {
        // Si ya existe cabecera activa creada al inicio, sincronizar y finalizar el borrador en Oracle
        res = await fetch(`${API_BASE_URL}/api/inspecciones/sincronizar-progreso`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cod_rep_c: codRepC,
            cod_rv: formularioInfo?.cod_rv,
            cod_usr: usuario?.id,
            nro_ref: articulo?.COD_ART,
            respuestas: respuestasMuestreo,
            conteo_muestra: conteoMuestra || String(muestrasGuardadas.length)
          })
        });
      } else {
        // Si no existía cabecera previa, llamar a guardar creando la cabecera
        res = await fetch(`${API_BASE_URL}/api/inspecciones/guardar`, {
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
      }
      const data = await res.json();
      if (data.success) {
        if (usuario?.id) {
          localStorage.removeItem(`draft_inspeccion_${usuario.id}`);
        }
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
      {alertaRestauracion && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 4px 15px rgba(245, 158, 11, 0.18)'
        }}>
          <div style={{
            backgroundColor: '#fef3c7',
            borderRadius: '50%',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={24} color="#d97706" />
          </div>
          <div>
            <h4 style={{ margin: 0, color: '#92400e', fontSize: '15px', fontWeight: '700' }}>
              ⚠️ Inspección pendiente detectada
            </h4>
            <p style={{ margin: '2px 0 0 0', color: '#b45309', fontSize: '13.5px', fontWeight: '600' }}>
              {alertaRestauracion}
            </p>
          </div>
        </div>
      )}

      <div className="ins-form-header">
        <img src={logoApk} alt="Desviaciones" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
        <button className="ins-btn-finalizar" onClick={handleFinalizarReporte} disabled={enviando}>
          {enviando ? <Loader2 size={14} className="spinner" /> : null}
          <Save size={20} />Finalizar Muestreo
        </button>
        <div className="ins-articulo-nombre">
          {articulo?.COD_ART} {articulo?.NOM_ARTICULO ? `- ${articulo.NOM_ARTICULO}` : ''}
          <span className="ins-articulo-descripcion">{articulo?.DESC_ETIQUETA}</span>
        </div>
        <button className="ins-btn-cambiar" onClick={handleCambiarArticulo}>
          Cambiar Artículo
        </button>
      </div>

      {
        mensaje && (
          <div className={`ins-toast ${mensaje.tipo}`}>
            {mensaje.tipo === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{mensaje.texto}</span>
          </div>
        )
      }

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
      {
        mostrarConfirm && (
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
        )
      }

      {/* ══ MODAL DE CONFIRMACIÓN DE FINALIZAR REPORTE ══ */}
      {
        confirmarFinalizar && (
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
        )
      }
      {/* ══ MODAL DE CONFIRMACIÓN DE CAMBIAR ARTÍCULO ══ */}
      {
        confirmarCambiarArticulo && (
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
function Inspecciones({ usuario, onLogout }) {
  const navigate = useNavigate();

  // pantalla: 'inicio' | 'seleccion' | 'campos' | 'formulario'
  const [pantalla, setPantalla] = useState('seleccion');
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [confirmarArticulo, setConfirmarArticulo] = useState(null);
  const [conteoMuestra, setConteoMuestra] = useState('');
  const [formularioInfo, setFormularioInfo] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [camposTextoValues, setCamposTextoValues] = useState(null); // valores Procedencia/Camara/Proveedor
  const [codRepC, setCodRepC] = useState(null); // Código de cabecera creado en Oracle BD
  //const [parteProduccionInput, setParteProduccionInput] = useState(''); // Parte de Producción seleccionado
  //const [partesProduccionLista, setPartesProduccionLista] = useState([]); // Lista de partes de la semana desde Oracle
  const [draftRestaurado, setDraftRestaurado] = useState(null);
  const [alertaRestauracion, setAlertaRestauracion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Cargar partes de producción recientes de Oracle al cargar el componente
 /*  useEffect(() => {
    const cargarPartes = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/inspecciones/partes-produccion`);
        const data = await res.json();
        if (data.success && Array.isArray(data.partes)) {
          setPartesProduccionLista(data.partes);
        }
      } catch (e) {
        console.error("Error cargando partes de producción de Oracle:", e);
      }
    };
    cargarPartes();
  }, []); */

  // Restaurar borrador pendiente (consulta BD de Oracle e integra memoria local si existe)
  useEffect(() => {
    if (!usuario?.id) return;

    const restaurarInspeccion = async () => {
      let draftLocal = null;
      try {
        const draftStr = localStorage.getItem(`draft_inspeccion_${usuario.id}`);
        if (draftStr) draftLocal = JSON.parse(draftStr);
      } catch (e) {
        console.error('Error leyendo borrador local:', e);
      }

      // Si existe borrador en memoria local completa con muestras, cargarlo de inmediato
      if (draftLocal && draftLocal.articulo && Array.isArray(draftLocal.muestrasGuardadas) && draftLocal.muestrasGuardadas.length > 0) {
        setArticuloSeleccionado(draftLocal.articulo);
        if (draftLocal.codRepC) setCodRepC(draftLocal.codRepC);
        if (draftLocal.conteoMuestra) setConteoMuestra(draftLocal.conteoMuestra);
        if (draftLocal.formularioInfo) setFormularioInfo(draftLocal.formularioInfo);
        if (draftLocal.preguntas) setPreguntas(draftLocal.preguntas);
        if (draftLocal.camposTextoValues) setCamposTextoValues(draftLocal.camposTextoValues);
        setDraftRestaurado(draftLocal);
        setPantalla('formulario');
        setAlertaRestauracion('Tiene una inspección abierta pendiente que debe finalizar.');
        return;
      }

      // Si se limpió el caché / datos de la tablet, consultar directamente a la BD de Oracle
      try {
        const res = await fetch(`${API_BASE_URL}/api/inspecciones/borrador-activo/${usuario.id}`);
        const data = await res.json();
        if (data.success && data.draft && data.draft.articulo && data.draft.articulo.COD_ART) {
          const draftBD = data.draft;
          setCodRepC(draftBD.cod_rep_c);
          setArticuloSeleccionado(draftBD.articulo);
          
          const muestrasReconstruidas = [];
          const respuestasMuestreo = (draftBD.respuestas || []).filter(r => r.resp_number !== null || r.resp_char !== null);
          const respuestasDesvio = respuestasMuestreo.filter(r => r.resp_number > 0);

          let nroMuestra = 1;
          respuestasDesvio.forEach(r => {
            const countDesvios = Number(r.resp_number || 0);
            for (let i = 0; i < countDesvios; i++) {
              const causaMatch = draftBD.causas[i] || draftBD.causas.find(c => c.item === r.item);
              muestrasReconstruidas.push({
                nro: nroMuestra++,
                desviacionCod: r.cod_pregunta,
                desviacionLabel: 'Desviación registrada',
                causaCod: causaMatch?.cod_mcd || null,
                causaLabel: causaMatch?.descr_causa || null,
                causaSubCat: causaMatch?.cod_sub_cat || null,
                sinDefecto: false
              });
            }
          });

          setDraftRestaurado({
            muestraActual: muestrasReconstruidas.length + 1,
            muestrasGuardadas: muestrasReconstruidas
          });
          setPantalla('formulario');
          setAlertaRestauracion('Tiene una inspección abierta pendiente que debe finalizar.');
        }
      } catch (e) {
        console.error('Error restaurando borrador activo desde BD:', e);
      }
    };

    restaurarInspeccion();
  }, [usuario]);

  // Auto-ocultar alerta de restauración a los 5 segundos
  useEffect(() => {
    if (alertaRestauracion) {
      const timer = setTimeout(() => {
        setAlertaRestauracion(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alertaRestauracion]);

  // Cargar formulario del inspector y parte de producción automático del día al montar
  useEffect(() => {
    const cargar = async () => {
      if (!usuario?.id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/inspecciones/formulario-hoy/${usuario.id}`);
        const data = await res.json();
        if (data.success) {
          setFormularioInfo(prev => prev || {
            nombre: data.formulario,
            area: data.area,
            cod_area: data.cod_area,
            turno: data.turno,
            version: `v${data.version}`,
            cod_rv: data.cod_rv,
            cod_reporte: data.cod_reporte
          });
          setPreguntas(prev => (prev && prev.length > 0) ? prev : (data.preguntas || []));
        } else {
          console.warn('Sin programación activa:', data.message);
        }

        // Cargar partes de producción activos con la consulta SQL del usuario y seleccionar automáticamente el primero
       /*  const resPartes = await fetch(`${API_BASE_URL}/api/inspecciones/partes-produccion`);
        const dataPartes = await resPartes.json();
        if (dataPartes.success && Array.isArray(dataPartes.partes) && dataPartes.partes.length > 0) {
          setPartesProduccionLista(dataPartes.partes);
          setParteProduccionInput(dataPartes.partes[0].cod_parte_producc);
        } */
      } catch (err) {
        console.error('Error cargando formulario o parte de producción:', err);
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
  }, []);

  const handleIniciarReporte = () => setPantalla('seleccion');

  const handleSeleccionarArticulo = async (art) => {
    setConfirmarArticulo(art);
  };

  const confirmarInicioInspeccion = async (art) => {
    setConfirmarArticulo(null);
    setArticuloSeleccionado(art);
    setDraftRestaurado(null);

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

    // Si el área es RECE y hay preguntas de texto (tipo V), ir primero a la pantalla de campos
    const preguntasFinales = currentFormInfo ? preguntas : [];
    const preguntasV = (preguntasFinales.length > 0 ? preguntasFinales : preguntas).filter(p => p.tipo_campo === 'V');
    const esRecepcion = (currentFormInfo?.cod_area || formularioInfo?.cod_area || '').trim().toUpperCase() === 'RECE';

    if (esRecepcion && preguntasV.length > 0) {
      setPantalla('campos');
    } else {
      // Crear cabecera directamente en la BD Oracle sólo si no existe una activa para esta sesión
      if (!codRepC) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/inspecciones/crear-cabecera`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cod_rv: (currentFormInfo || formularioInfo)?.cod_rv,
              nro_ref: art.COD_ART,
              cod_usr: usuario?.id,
              parte_produccion: parteProduccionInput ? parteProduccionInput.trim() : null,
              camposTexto: []
            })
          });
          const data = await res.json();
          if (data.success && data.cod_rep_c) {
            setCodRepC(data.cod_rep_c);
          }
        } catch (e) {
          console.error("Error creando cabecera en Oracle:", e);
        }
      }
      setPantalla('formulario');
    }
  };

  const handleCrearCabeceraConCampos = async (vals) => {
    setCamposTextoValues(vals);
    if (!codRepC) {
      try {
        const preguntasV = preguntas.filter(p => p.tipo_campo === 'V');
        const camposPayload = preguntasV.map(p => ({
          cod_pregunta: p.id,
          resp_varchar: vals[p.id] ? vals[p.id].trim() : null
        }));

        const res = await fetch(`${API_BASE_URL}/api/inspecciones/crear-cabecera`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cod_rv: formularioInfo?.cod_rv,
            nro_ref: articuloSeleccionado?.COD_ART,
            cod_usr: usuario?.id,
            parte_produccion: parteProduccionInput ? parteProduccionInput.trim() : null,
            camposTexto: camposPayload
          })
        });
        const data = await res.json();
        if (data.success && data.cod_rep_c) {
          setCodRepC(data.cod_rep_c);
        }
      } catch (e) {
        console.error("Error creando cabecera con campos en Oracle:", e);
      }
    }
    setPantalla('formulario');
  };

  const handleCambiarArticulo = () => {
    setArticuloSeleccionado(null);
    setCodRepC(null);
    //setParteProduccionInput('');
    setPantalla('seleccion');
  };

  const handleFinalizar = () => {
    if (usuario?.id) {
      localStorage.removeItem(`draft_inspeccion_${usuario.id}`);
    }
    setArticuloSeleccionado(null);
    setCodRepC(null);
    setConteoMuestra('');
    setDraftRestaurado(null);
    setCamposTextoValues(null);
    setPantalla('seleccion');
  };

  const inspeccionEnProgreso = pantalla === 'formulario' && articuloSeleccionado !== null;

  return (
    <Layout
      usuario={usuario}
      inspeccionEnProgreso={inspeccionEnProgreso}
      onConfirmarSalida={handleFinalizar}
      onLogout={onLogout}
    >
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
                  <p style={{ marginBottom: '12px' }}>
                    ¿Desea iniciar la inspección para el artículo:{' '}
                    <strong>
                      {confirmarArticulo.COD_ART} {confirmarArticulo.NOM_ARTICULO ? `- ${confirmarArticulo.NOM_ARTICULO}` : ''}
                    </strong>?
                  </p>

                  {/* Parte de Producción automático asignado desde Oracle */}
                  <div style={{ textAlign: 'left', marginBottom: '16px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Parte de Producción del Día:
                    </label>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e3a8a' }}>
                      {(() => {
                        const parteObj = partesProduccionLista.find(p => p.cod_parte_producc === parteProduccionInput) || partesProduccionLista[0];
                        if (parteObj) {
                          const descStr = parteObj.descripcion ? ` - ${parteObj.descripcion}` : '';
                          const espStr = parteObj.especie ? ` (${parteObj.especie})` : '';
                          return `${parteObj.cod_parte_producc} — ${parteObj.fecha_parte}${descStr}${espStr}`;
                        }
                        return parteProduccionInput || 'Asignado automáticamente';
                      })()}
                    </div>
                  </div>  

                  <div className="ins-modal-acciones">
                    <button
                      className="ins-modal-no"
                      onClick={() => {
                        setConfirmarArticulo(null);
                       // setParteProduccionInput('');
                      }}
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
        ) : pantalla === 'campos' ? (
          <PantallaCamposTexto
            preguntasTexto={preguntas.filter(p => p.tipo_campo === 'V')}
            onConfirmar={handleCrearCabeceraConCampos}
            onCancelar={() => {
              setArticuloSeleccionado(null);
              setPantalla('seleccion');
            }}
          />
        ) : (
          <PantallaFormulario
            articulo={articuloSeleccionado}
            codRepC={codRepC}
            conteoMuestra={conteoMuestra}
            formularioInfo={formularioInfo}
            preguntas={preguntas}
            camposTextoValues={camposTextoValues}
            usuario={usuario}
            onFinalizar={handleFinalizar}
            onCambiarArticulo={handleCambiarArticulo}
            draftRestaurado={draftRestaurado}
            alertaRestauracion={alertaRestauracion}
          />
        )}
      </div>
    </Layout>
  );
}

export default Inspecciones;
