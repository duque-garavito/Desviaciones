import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Search,
  BarChart3,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import logo from '../assets/images/fishlogo.png';
import { API_BASE_URL } from '../config';
import './Layout.css';

// ── Lista del menú lateral (solo opciones de inspector) ──
const menuItems = [
  { id: 'dashboard', label: 'Programación Semanal', icono: <Calendar size={20} />, ruta: '/dashboard' },
  { id: 'inspecciones', label: 'Muestreo de Desviaciones ', icono: <Search size={20} />, ruta: '/inspecciones' },
  { id: 'registros', label: 'Visualización de Registros', icono: <BarChart3 size={20} />, ruta: '/registros' },
];

// COMPONENTE LAYOUT (Navbar + Sidebar juntos)
function Layout({ usuario, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Estado compartido
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [areaActual, setAreaActual] = useState(usuario?.areaAsignada || 'Sin asignar');
  const [turnoActual, setTurnoActual] = useState(usuario?.turno || 'Día');

  // ── Buscar programación real al cargar 
  useEffect(() => {
    if (usuario?.perfil === 'SUP_CALI' && usuario?.id) {
      fetch(`${API_BASE_URL}/api/programacion/usuario/${usuario.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Fecha en formato YYYY-MM-DD local
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const hoyISO = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];

            const hoyProg = data.find(p => p.FECHA.startsWith(hoyISO));
            if (hoyProg) {
              setAreaActual(hoyProg.area || 'Área no definida');
              setTurnoActual(hoyProg.TURNO === 'Noche' || hoyProg.TURNO === 'NOCHE' ? 'Noche' : 'Día');
            } else {
              setAreaActual('Sin asignar');
              setTurnoActual('Día');
            }
          }
        })
        .catch(err => console.error('Error actualizando navbar:', err));
    }
  }, [usuario, location.pathname]);

  // ── Fecha actual 
  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    day: 'numeric', month: 'numeric', year: 'numeric',
  });

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <div className="layout-root">

      {/* Botón de menú hamburguesa flotante premium */}
      <button
        className={`hamburger-btn ${sidebarOpen ? 'abierto' : ''}`}
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label="Menú"
        title="Alternar Menú Principal"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        <span className="hamburger-label">{sidebarOpen ? 'Cerrar' : 'Menú'}</span>
      </button>


      {/* ─── SIDEBAR + OVERLAY ─── */}
      {/* Overlay: al hacer click fuera cierra el sidebar */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <nav className="sidebar-menu">
          <img src={logo} alt="Logo Fisholg" className="sidebar-menu-logo" />
          {/*informacion del usuario */}
          <div className="user-info">
            <span className="user-name">Hola, {usuario?.nombre || 'Usuario'}</span>
            <span className="user-role">
              {usuario?.perfil === 'JF_CALID'
                ? 'Jefe de Calidad'
                : (usuario?.perfil === 'SUP_CALI' ? 'Supervisor de Calidad' : usuario?.perfil || 'Invitado')}
            </span>
          </div>

          <br />

          <p className="sidebar-section-label">MENÚ PRINCIPAL</p>
          {menuItems.map((item) => {
            const isActivo = location.pathname === item.ruta;
            return (
              <button
                key={item.id}
                className={`sidebar-item ${isActivo ? 'sidebar-item-activo' : ''}`}
                onClick={() => { navigate(item.ruta); setSidebarOpen(false); }}
              >
                <span className="sidebar-icono">{item.icono}</span>
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/*boton de salir*/}
        <button onClick={handleLogout} className="logout-btn" title="Cerrar Sesión">
          <LogOut size={16} />
          <span className="logout-text">Salir</span>
        </button>
      </aside>

      {/* ─── CONTENIDO DE LA PÁGINA ─── */}
      {/* "children" es lo que pongas dentro de <Layout>...</Layout> en cada página */}
      <main className="layout-main">
        {children}
      </main>

    </div>
  );
}

export default Layout;
