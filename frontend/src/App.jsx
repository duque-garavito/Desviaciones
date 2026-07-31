import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inspecciones from './components/Inspecciones';
import Registros from './components/Registros';

function App() {
  // Al iniciar, React revisa si hay un usuario guardado en localStorage
  const [usuarioActual, setUsuarioActual] = useState(() => {
    try {
      const guardado = localStorage.getItem('usuario');
      if (guardado && guardado !== "undefined") {
        const parsed = JSON.parse(guardado);
        // Retrocompatibilidad para sesiones antiguas que solo tienen 'rol'
        if (parsed && !parsed.perfil && parsed.rol) {
          parsed.perfil = parsed.rol === 'ADMINISTRADOR' ? 'JF_CALID' : 'SUP_CALI';
        }
        return parsed;
      }
      return null;
    } catch (e) {
      console.error("Error al leer sesión:", e);
      localStorage.removeItem('usuario');
      return null;
    }
  });

  // Componente para proteger rutas por login
  const RutaProtegida = ({ children }) => {
    if (!usuarioActual) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            usuarioActual ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/login"
          element={
            usuarioActual ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLoginExitoso={setUsuarioActual} />
            )
          }
        />

        <Route path="/dashboard" element={
          <RutaProtegida>
            <Dashboard usuario={usuarioActual} onLogout={() => setUsuarioActual(null)} />
          </RutaProtegida>
        } />

        <Route path="/inspecciones" element={
          <RutaProtegida>
            <Inspecciones usuario={usuarioActual} onLogout={() => setUsuarioActual(null)} />
          </RutaProtegida>
        } />

        <Route path="/registros" element={
          <RutaProtegida>
            <Registros usuario={usuarioActual} onLogout={() => setUsuarioActual(null)} />
          </RutaProtegida>
        } />

        <Route
          path="*"
          element={
            usuarioActual ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
