import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [usuarioActual, setUsuarioActual] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const guardado = localStorage.getItem("usuario");

            if (guardado && guardado !== "undefined") {
                const usuario = JSON.parse(guardado);

                if (usuario && !usuario.perfil && usuario.rol) {
                    usuario.perfil =
                        usuario.rol === "ADMINISTRADOR"
                            ? "JF_CALID"
                            : "SUP_CALI";
                }

                setUsuarioActual(usuario);
            }
        } catch (e) {
            console.error("Error al leer sesión:", e);
            localStorage.removeItem("usuario");
        } finally {
            setLoading(false);
        }
    }, []);

    const login = (usuariodata) => {
        setUsuarioActual(usuariodata);
        localStorage.setItem("usuario", JSON.stringify(usuariodata));
    };

    const logout = () => {
        setUsuarioActual(null);
        localStorage.removeItem("usuario");
    };

    return (
        <AuthContext.Provider
            value={{
                usuarioActual,
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
        throw new Error(
            'useAuthContext debe usarse dentro de AuthContextProvider'
        );
    }

    return context;
}