import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./views/LoginScreen";
import Dashboard from "./views/DashboardView";
import InspeccionScreen from "./views/InspeccionScreen";
import Registros from "./views/Registros";
import Layout from "./components/Layout"; // <-- Nuevo
import { DesviacionProvider } from './core/Context/DesviacionContext';

import { useAuth } from "./core/Context/AuthContext";

function RutaProtegida() {
    const { autenticado, loading } = useAuth();

    if (loading) return null;

    return autenticado ? (
        <Layout />
    ) : (
        <Navigate to="/login" replace />
    );
}

function App() {
    const { autenticado, loading } = useAuth();

    if (loading) return null;

    return (
        <Router>
            <Routes>

                <Route
                    path="/"
                    element={
                        autenticado
                            ? <Navigate to="/dashboard" replace />
                            : <Navigate to="/login" replace />
                    }
                />

                <Route
                    path="/login"
                    element={
                        autenticado
                            ? <Navigate to="/dashboard" replace />
                            : <Login />
                    }
                />

             
                <Route element={<RutaProtegida />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/inspecciones" element={
                        <DesviacionProvider>
                        <InspeccionScreen />
                        </DesviacionProvider>
                        } />
                    <Route path="/registros" element={<Registros />} />
                </Route>

                <Route
                    path="*"
                    element={
                        autenticado
                            ? <Navigate to="/dashboard" replace />
                            : <Navigate to="/login" replace />
                    }
                />

            </Routes>
        </Router>
    );
}

export default App;