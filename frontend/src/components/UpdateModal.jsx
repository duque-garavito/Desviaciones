import React from 'react';
import { Download, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAppUpdate } from '../core/hooks/useAppUpdate';
import '../assets/css/UpdateModal.css';

/**
 * Aviso de nueva versión del APK.
 *
 * Se monta una sola vez en App.jsx y vive fuera del router: la actualización
 * debe ofrecerse aunque el usuario todavía no haya iniciado sesión.
 */
function UpdateModal() {
  const {
    infoVersion,
    modalVisible,
    descargando,
    progreso,
    error,
    versionActual,
    descargarEInstalar,
    cerrarModal,
  } = useAppUpdate();

  if (!modalVisible || !infoVersion) return null;

  const obligatoria = Boolean(infoVersion.mandatory);
  // --- SOLO LOS CAMBIOS DE LA VERSION QUE SE VA A INSTALAR, NO TODO EL HISTORIAL
  const cambios =
    infoVersion.changelog?.find((c) => c.version === infoVersion.version)?.changes ?? [];

  return (
    <div
      className="update-overlay"
      onClick={() => {
        // AL CERRAR EL MODAL, SI LA ACTUALIZACION ES OBLIGATORIA, NO SE CIERRA
        if (!obligatoria && !descargando) cerrarModal();
      }}
    >
      <div className="update-card" onClick={(e) => e.stopPropagation()}>

        <div className="update-header">
          <div className="update-icon">
            <Download size={26} color="#1756a6" />
          </div>
          <div>
            <h3>Nueva versión disponible</h3>
            <p className="update-versiones">
              <span className="update-version-actual">{versionActual}</span>
              <ArrowRight size={14} />
              <span className="update-version-nueva">{infoVersion.version}</span>
            </p>
          </div>
        </div>

        <div className="update-body">
          {obligatoria && (
            <p className="update-obligatoria">
              Esta actualización es obligatoria para seguir usando la aplicación.
            </p>
          )}

          {cambios.length > 0 && (
            <>
              <p className="update-subtitulo">Novedades</p>
              <ul className="update-cambios">
                {cambios.map((cambio, i) => (
                  <li key={i}>{cambio}</li>
                ))}
              </ul>
            </>
          )}

          {descargando && (
            <div className="update-progreso">
              <div className="update-progreso-barra">
                <div className="update-progreso-relleno" style={{ width: `${progreso}%` }} />
              </div>
              <span className="update-progreso-texto">Descargando… {progreso}%</span>
            </div>
          )}

          {error && (
            <div className="update-error">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="update-acciones">
          {!obligatoria && (
            <button
              type="button"
              className="update-btn update-btn-secundario"
              onClick={cerrarModal}
              disabled={descargando}
            >
              Ahora no
            </button>
          )}

          <button
            type="button"
            className="update-btn update-btn-primario"
            onClick={descargarEInstalar}
            disabled={descargando}
          >
            {descargando ? 'Descargando…' : error ? 'Reintentar' : 'Actualizar'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default UpdateModal;
