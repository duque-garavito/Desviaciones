import { createContext, useContext, useEffect, useState } from "react";

const DesviacionContext = createContext();

/* 
Data Del Provider

-- Data el Articulo Seleccionado
-- Data del Plan Seleccionado
-- Data del Reporte Generado
-- limpiar datos del estado

*/

export function DesviacionProvider({ children }) {
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [reporteGenerado, setReporteGenerado] = useState(null);
  const [muestrasActuales, setMuestrasActuales] = useState([]);
  const [datosGenerales, setDatosGenerales] = useState([]);
  const [loading, setLoading] = useState(true);

  const seleccionarArticulo = (articulo) => {
    localStorage.setItem("articuloSeleccionado", JSON.stringify(articulo));
    setArticuloSeleccionado(articulo);
  };

  const seleccionarPlan = (plan) => {
    localStorage.setItem("planSeleccionado", JSON.stringify(plan));
    setPlanSeleccionado(plan);
  };

  const seleccionarReporte = (reporte) => {
    localStorage.setItem("reporteGenerado", JSON.stringify(reporte));
    setReporteGenerado(reporte);
  };

  const asignarMuestras = (muestra) => {
    setMuestrasActuales((prev) => [...prev, muestra]);
  };

  const asignarDatosGenerales = (datos) => {
    localStorage.setItem("datosGenerales", JSON.stringify(datos));
    setDatosGenerales(datos);
  };

  const limpiarDatosGenerales = () => {
    localStorage.removeItem("datosGenerales");
    setDatosGenerales([]);
  };

  const limpiarMuestrasActuales = () => {
    localStorage.removeItem("muestrasActuales");
    setMuestrasActuales([]);
  };

  // Limpiar datos del estado
  const limpiarDatosInspeccion = () => {
    limpiarArticulo();
    limpiarPlan();
    limpiarReporte();
    limpiarMuestrasActuales();
    limpiarDatosGenerales();
  };

  const limpiarArticulo = () => {
    localStorage.removeItem("articuloSeleccionado");
    setArticuloSeleccionado(null);
    limpiarMuestrasActuales();
  };

  const limpiarPlan = () => {
    localStorage.removeItem("planSeleccionado");
    setPlanSeleccionado(null);
  };

  const limpiarReporte = () => {
    localStorage.removeItem("reporteGenerado");
    setReporteGenerado(null);
    limpiarDatosGenerales();
  };

  useEffect(() => {
    try {
      const articulo = localStorage.getItem("articuloSeleccionado");
      const plan = localStorage.getItem("planSeleccionado");
      const reporte = localStorage.getItem("reporteGenerado");
      const muestras = localStorage.getItem("muestrasActuales");
      const datosGenerales = localStorage.getItem("datosGenerales");

      if (articulo) {
        setArticuloSeleccionado(JSON.parse(articulo));
      }
      if (plan) {
        setPlanSeleccionado(JSON.parse(plan));
      }
      if (reporte) {
        setReporteGenerado(JSON.parse(reporte));
      }
      if (muestras) {
        setMuestrasActuales(JSON.parse(muestras));
      }
      if (datosGenerales) {
        setDatosGenerales(JSON.parse(datosGenerales));
      }
    } catch (error) {
      console.error("Error al leer datos del estado:", error);
      localStorage.removeItem("articuloSeleccionado");
      localStorage.removeItem("planSeleccionado");
      localStorage.removeItem("reporteGenerado");
      localStorage.removeItem("muestrasActuales");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    localStorage.setItem("muestrasActuales", JSON.stringify(muestrasActuales));
  }, [muestrasActuales, loading]);

  const data = {
    articuloSeleccionado,
    seleccionarArticulo,
    planSeleccionado,
    seleccionarPlan,
    reporteGenerado,
    seleccionarReporte,
    limpiarDatosInspeccion,
    limpiarArticulo,
    limpiarPlan,
    limpiarReporte,
    asignarMuestras,
    muestrasActuales,
    asignarDatosGenerales,
    datosGenerales,
  };

  return (
    <DesviacionContext.Provider value={data}>
      {children}
    </DesviacionContext.Provider>
  );
}

//HOOK

export function useDesviacion() {
  const context = useContext(DesviacionContext);

  if (!context) {
    throw new Error("useDesviacion debe usarse dentro de DesviacionProvider");
  }

  return context;
}
