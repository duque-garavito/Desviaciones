import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [turnoActual, setTurnoActual] = useState(null);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem("usuario");
      const guardado2 = localStorage.getItem("turno");

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
    } catch (e) {
      console.error("Error al leer sesión:", e);
      localStorage.removeItem("usuario");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (usuariodata, turnodata) => {
    setUsuarioActual(usuariodata);
    setTurnoActual(turnodata);
    localStorage.setItem("usuario", JSON.stringify(usuariodata));
    localStorage.setItem("turno", JSON.stringify(turnodata));
  };

  const logout = () => {
    setUsuarioActual(null);
    setTurnoActual(null);
    localStorage.removeItem("usuario");
    localStorage.removeItem("turno");
  };

  return (
    <AuthContext.Provider
      value={{
        usuarioActual,
        turnoActual,
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
