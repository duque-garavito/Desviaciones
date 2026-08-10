import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Network } from "@capacitor/network";
import "../assets/css/OfflineBanner.css";

export default function OfflineBanner() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let networkListener = null;

    const setupNetworkListener = async () => {
      try {
        // 1. Estado inicial nativo en Android APK
        const status = await Network.getStatus();
        setIsConnected(status.connected);

        // 2. Escuchador de red nativo Android (Capacitor)
        networkListener = await Network.addListener("networkStatusChange", (status) => {
          console.log("Cambio de estado de red nativo:", status);
          setIsConnected(status.connected);
        });
      } catch (err) {
        console.log("Entorno Web: usando listeners de ventana navigator.onLine", err);
        setIsConnected(navigator.onLine);
      }
    };

    setupNetworkListener();

    // 3. Fallback para navegador web convencional
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (networkListener && networkListener.remove) {
        networkListener.remove();
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isConnected) return null; // Si hay conexión, no muestra nada

  return (
    <div className="offline-overlay">
      <div className="offline-card">
        <div className="offline-icon-wrapper">
          <WifiOff size={42} className="offline-icon" />
        </div>
        
        <h2>Sin conexión a Internet</h2>
        
        <p>
          Se ha perdido la conexión a la red. Por favor, verifica tu conexión a Wi-Fi para continuar.
        </p>

        <div className="offline-status-indicator">
          <RefreshCw size={16} className="offline-spinner" />
          <span>Esperando que se restablezca la red…</span>
        </div>
      </div>
    </div>
  );
}


