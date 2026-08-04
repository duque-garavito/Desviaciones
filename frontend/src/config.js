import { Capacitor } from '@capacitor/core';

// Configuración de la API
// En APK nativo (Tablet conectada por USB), se usa http://localhost:3002 con 'adb reverse'
// En navegador Web PC, se usa http://localhost:3002 o IP local
const isNative = Capacitor.isNativePlatform();

export const API_BASE_URL = isNative
  ? 'http://localhost:3002'
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3002'
    : 'http://192.168.10.93:3002';

// Texto centralizado del pie de página
export const FOOTER_TEXT = "© 2026 Refrigerados FISHOLG & Hijos SAC - Sistema de Desvios";
