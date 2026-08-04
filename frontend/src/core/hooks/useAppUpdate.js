import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { ConsultarVersionServidor } from '../services/Version.service';

const AppUpdate = registerPlugin('AppUpdate');

const ESTADO_INICIAL = {
  verificando: false,
  hayActualizacion: false,
  infoVersion: null,
  modalVisible: false,
  descargando: false,
  progreso: 0,
  error: null,
};

//--- COMPARA VERSIONES SEMANTICAS
function esMasNueva(actual, servidor) {
  const partes = (v) => String(v || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const a = partes(actual);
  const b = partes(servidor);

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }

  return false;
}

// --- ESTADO Y VERSIONES -- CONSULTA VERSION DEL APK INSTALADO Y LEVANTA EL MODAL DE ACTUALIZACION
export function useAppUpdate() {
  const [estado, setEstado] = useState(ESTADO_INICIAL);
  const [versionActual, setVersionActual] = useState(null);
  const esNativo = Capacitor.isNativePlatform();
  const listenerRef = useRef(null);

  // ── VERSION ACTUAL DEL APK
  useEffect(() => {
    if (!esNativo) return;

    let cancelado = false;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const info = await App.getInfo();
        if (!cancelado) setVersionActual(info.version);
      } catch (error) {
        console.log('No se pudo leer la versión instalada:', error.message);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [esNativo]);

  // ── PROGRESO DE DESCARGA
  useEffect(() => {
    if (!esNativo) return;

    (async () => {
      listenerRef.current = await AppUpdate.addListener('progresoDescarga', (data) => {
        setEstado((s) => ({ ...s, progreso: data?.porcentaje ?? 0 }));
      });
    })();

    return () => {
      listenerRef.current?.remove?.();
      listenerRef.current = null;
    };
  }, [esNativo]);

  const verificarActualizacion = useCallback(async () => {

    if (!esNativo || !versionActual) return;

    setEstado((s) => ({ ...s, verificando: true, error: null }));

    const info = await ConsultarVersionServidor();

    if (!info || !info.downloadUrl) {
      setEstado((s) => ({ ...s, verificando: false }));
      return;
    }

    const hayActualizacion = esMasNueva(versionActual, info.version);

    setEstado((s) => ({
      ...s,
      verificando: false,
      hayActualizacion,
      infoVersion: info,
      modalVisible: hayActualizacion,
    }));
  }, [esNativo, versionActual]);

  useEffect(() => {
    verificarActualizacion();
  }, [verificarActualizacion]);

  const descargarEInstalar = useCallback(async () => {
    if (!estado.infoVersion?.downloadUrl || !esNativo) return;

    setEstado((s) => ({ ...s, descargando: true, progreso: 0, error: null }));

    try {
      await AppUpdate.descargarEInstalar({ url: estado.infoVersion.downloadUrl });

      //--- CERRAR LA APP CUANDO SE INSTALA LA ACTUALIZACION
      setEstado((s) => ({
        ...s,
        descargando: false,
        modalVisible: false,
        hayActualizacion: false,
      }));
    } catch (error) {
      const detalle = error?.message ?? String(error);
      console.log('Error al actualizar:', detalle);
      setEstado((s) => ({ ...s, descargando: false, error: detalle }));
    }
  }, [estado.infoVersion, esNativo]);

  const cerrarModal = useCallback(() => {
    //--- MODAL NO SE CIERRA -- FORZADO POR ACTUALIZACION OBLIGATORIA
    if (estado.infoVersion?.mandatory) return;
    setEstado((s) => ({ ...s, modalVisible: false }));
  }, [estado.infoVersion?.mandatory]);

  return {
    ...estado,
    versionActual,
    verificarActualizacion,
    descargarEInstalar,
    cerrarModal,
  };
}
