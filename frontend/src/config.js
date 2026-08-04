import { Capacitor } from '@capacitor/core';
const isNative = Capacitor.isNativePlatform();

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isNative
    ? 'http://localhost:3002'
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3002'
      : 'http://192.168.10.93:3002');

// Texto centralizado del pie de página
export const FOOTER_TEXT = "© 2026 Refrigerados FISHOLG & Hijos SAC - Sistema de Desvios";
export const UPDATE_API_URL =
  import.meta.env.VITE_UPDATE_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://192.168.10.93:3002';
