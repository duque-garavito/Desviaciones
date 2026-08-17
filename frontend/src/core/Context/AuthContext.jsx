import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [turnoActual, setTurnoActual] = useState(null);
  const [areaActiva, setAreaActiva] = useState(null);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem("usuario");
      const guardado2 = localStorage.getItem("turno");
      const areaGuardada = localStorage.getItem("areaActiva");

      if (
        guardado &&
        guardado !== "undefined" &&
        guardado2 &&
        guardado2 !== "undefined"
      ) {
        const usuario = JSON.parse(guardado);
        const turno = JSON.parse(guardado2);

        if (usuario && !usuario.perfil && usuario.rol) {
          usuario.perfil =
            usuario.rol === "ADMINISTRADOR" ? "JF_CALID" : "SUP_CALI";
        }

        setUsuarioActual(usuario);
        setTurnoActual(turno);
      }

      if (areaGuardada && areaGuardada !== "undefined") {
        setAreaActiva(JSON.parse(areaGuardada));
      }
    } catch (e) {
      console.error("Error al leer sesión:", e);
      localStorage.removeItem("usuario");
    } finally {
      setLoading(false);
    }
  }, []);

  const seleccionarArea = (area) => {
    setAreaActiva(area);
    localStorage.setItem("areaActiva", JSON.stringify(area));
  };

  const limpiarArea = () => {
    setAreaActiva(null);
    localStorage.removeItem("areaActiva");
  };

  const login = (usuariodata, turnodata) => {
    setUsuarioActual(usuariodata);
    setTurnoActual(turnodata);
    localStorage.setItem("usuario", JSON.stringify(usuariodata));
    localStorage.setItem("turno", JSON.stringify(turnodata));
  };

  const actualizarTurno = (turno) => {
    setTurnoActual(turno);
    localStorage.setItem("turno", JSON.stringify(turno));
  };

  const logout = () => {
    setUsuarioActual(null);
    setTurnoActual(null);
    limpiarArea();
    localStorage.removeItem("usuario");
    localStorage.removeItem("turno");
  };

  return (
    <AuthContext.Provider
      value={{
        usuarioActual,
        turnoActual,
        areaActiva,
        seleccionarArea,
        limpiarArea,
        actualizarTurno,
        loading,
        login,
        logout,
        autenticado: !!usuarioActual,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext debe usarse dentro de AuthContextProvider");
  }

  return context;
}
