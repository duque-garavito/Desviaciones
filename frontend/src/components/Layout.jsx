import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Search,
  BarChart3,
  LogOut,
  Menu,
  AlertTriangle
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

// COMPONENTE LAYOUT (Navbar + Sidebar juntos + Guardia de Navegación)
function Layout({ usuario, inspeccionEnProgreso = false, onConfirmarSalida, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Estado compartido
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Modal de confirmación de salida cuando hay inspección activa
  const [modalSalidaAbierto, setModalSalidaAbierto] = useState(false);
  const [destinoPendiente, setDestinoPendiente] = useState(null);

  const [areaActual, setAreaActual] = useState(usuario?.areaAsignada || 'Sin asignar');
  const [turnoActual, setTurnoActual] = useState(usuario?.turno || 'Día');

  // ── Buscar programación real al cargar 
  useEffect(() => {
    if (usuario?.perfil === 'SUP_CALI' && usuario?.id) {
      fetch(`${API_BASE_URL}/api/programacion/usuario/${usuario.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const hoyISO = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];

            const hoyProg = data.find(p => p.FECHA && p.FECHA.startsWith(hoyISO));
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

  // ── Interceptar botón Atrás nativo de Android (Lenovo Tablet) via Capacitor
  useEffect(() => {
    let appListener = null;

    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        appListener = await App.addListener('backButton', (data) => {
          if (inspeccionEnProgreso) {
            // Si está realizando inspección, NO cerrar el APK: pedir confirmación
            setDestinoPendiente('atras');
            setModalSalidaAbierto(true);
          } else if (location.pathname === '/inspecciones' || location.pathname === '/registros') {
            navigate('/dashboard');
          } else if (location.pathname === '/dashboard') {
            // En dashboard, pedir confirmación antes de salir del APK
            const confirmExit = window.confirm("¿Desea cerrar la aplicación?");
            if (confirmExit) {
              App.exitApp();
            }
          } else if (data.canGoBack) {
            window.history.back();
          }
        });
      } catch (err) {
        console.log('Ambiente Web / Plugin Capacitor no activo:', err);
      }
    };

    setupBackButton();

    return () => {
      if (appListener && appListener.remove) {
        appListener.remove();
      }
    };
  }, [inspeccionEnProgreso, location.pathname, navigate]);

  // ── Interceptar cierre o recarga de pestaña en navegador web
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (inspeccionEnProgreso) {
        e.preventDefault();
        e.returnValue = 'Tiene una inspección en progreso. Se perderá el avance no guardado.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [inspeccionEnProgreso]);

  // Manejar clic en opciones de navegación del sidebar
  const handleNavegarRequest = (destino) => {
    setSidebarOpen(false);
    if (inspeccionEnProgreso) {
      setDestinoPendiente(destino);
      setModalSalidaAbierto(true);
    } else {
      ejecutarNavegacion(destino);
    }
  };

  const ejecutarNavegacion = (destino) => {
    if (destino === 'logout') {
      localStorage.removeItem('usuario');
      if (usuario?.id) {
        localStorage.removeItem(`draft_inspeccion_${usuario.id}`);
      }
      if (onLogout) {
        onLogout();
      }
      navigate('/login', { replace: true });
    } else if (destino === 'atras') {
      if (onConfirmarSalida) onConfirmarSalida();
    } else if (destino) {
      if (onConfirmarSalida) onConfirmarSalida();
      navigate(destino);
    }
  };

  const handleConfirmarSalidaModal = () => {
    const dest = destinoPendiente;
    setModalSalidaAbierto(false);
    setDestinoPendiente(null);
    ejecutarNavegacion(dest);
  };

  const handleLogoutRequest = () => {
    handleNavegarRequest('logout');
  };

  return (
    <div className="layout-root">

      {/* Botón de menú hamburguesa (solo icono, desaparece al abrir sidebar) */}
      <button
        className={`hamburger-btn ${sidebarOpen ? 'oculto' : ''}`}
        onClick={() => setSidebarOpen(true)}
        aria-label="Menú"
        title="Menú"
      >
        <Menu size={26} />
      </button>


      {/* ─── SIDEBAR + OVERLAY ─── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <nav className="sidebar-menu">
          <img src={logo} alt="Logo Fisholg" className="sidebar-menu-logo" />
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
                onClick={() => handleNavegarRequest(item.ruta)}
              >
                <span className="sidebar-icono">{item.icono}</span>
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button onClick={handleLogoutRequest} className="logout-btn" title="Cerrar Sesión">
          <LogOut size={16} />
          <span className="logout-text">Salir</span>
        </button>
      </aside>

      {/* ─── CONTENIDO DE LA PÁGINA ─── */}
      <main className="layout-main">
        {children}
      </main>

      {/* ─── MODAL DE CONFIRMACIÓN DE SALIDA DE INSPECCIÓN ─── */}
      {modalSalidaAbierto && (
        <div className="layout-confirm-overlay" onClick={() => setModalSalidaAbierto(false)}>
          <div className="layout-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="layout-confirm-header">
              <div className="layout-confirm-icon">
                <AlertTriangle size={26} color="#dc2626" />
              </div>
              <h3>Alerta</h3>
            </div>
            <div className="layout-confirm-body" style={{ textAlign: 'center', margin: '10px 0 20px 0' }}>
              <p style={{ fontSize: '16px', color: '#0f172a', lineHeight: '1.6' }}>
                Tiene una <strong>inspección en proceso</strong>.
                <br />
                <span style={{ color: '#dc2626', fontWeight: '600' }}>
                  No puede salir de una inspección sin antes finalizarla o guardarla.
                </span>
              </p>
            </div>
            <div className="layout-confirm-actions" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-confirm-cancel"
                style={{ backgroundColor: '#1756a6', color: '#ffffff', border: 'none', padding: '12px 28px', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}
                onClick={() => {
                  setModalSalidaAbierto(false);
                  setDestinoPendiente(null);
                }}
              >
                Volver a la Inspección
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Layout;
