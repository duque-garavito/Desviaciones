import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/Login.css';
import { API_BASE_URL } from '../config';
import logo from '../assets/images/fishlogo.png';

function Login({ onLoginExitoso }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Intentando iniciar sesión con:", username, password);

    try {
      const response = await fetch(`${API_BASE_URL}/api/usuarios/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("Datos del usuario:", data.usuario);

        if (onLoginExitoso) {
          localStorage.setItem('usuario', JSON.stringify(data.usuario));
          onLoginExitoso(data.usuario);
        }
        navigate('/dashboard');
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      const urlDestino = `${API_BASE_URL}/api/usuarios/login`;
      const redStatus = navigator.onLine ? "Red activa" : "Sin conexión Wi-Fi";
      const detalleError = [
        `URL: ${urlDestino}`,
        `Error: ${error?.name || 'Error'} - ${error?.message || String(error)}`,
        `Estado Red: ${redStatus}`
      ].join('\n\n');
      alert(`⚠️ No se pudo conectar con el servidor:\n\n${detalleError}`);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-placeholder">
          <img src={logo} alt="Logo Fisholg" />
        </div>

        <h2>Bienvenido</h2>
        <p>Por favor, ingresa a tu cuenta</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              placeholder="Ingrese su Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn">Iniciar Sesión</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
