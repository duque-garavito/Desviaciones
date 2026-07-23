// Configuración dinámica de la API
// Detecta si estamos en localhost en la PC o en la Tablet (APK/Red local)
const hostname = window.location.hostname;

const isLocalBrowser = (hostname === 'localhost' || hostname === '127.0.0.1') && window.location.port;

export const API_BASE_URL = isLocalBrowser
  ? 'http://localhost:3002'
  : 'http://192.168.10.93:3002'; // IP de tu PC servidor en la red local
