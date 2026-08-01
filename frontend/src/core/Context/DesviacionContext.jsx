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

    const [articuloSeleccionado,setArticuloSeleccionado] = useState(null);
    const [planSeleccionado,setPlanSeleccionado] = useState(null);
    const [reporteGenerado,setReporteGenerado] = useState(null);


    const seleccionarArticulo = (articulo) => {
        setArticuloSeleccionado(articulo);
       
    }

    const seleccionarPlan = (plan) => {
        setPlanSeleccionado(plan);
    }

    const seleccionarReporte = (reporte) => {
        setReporteGenerado(reporte);
    }

    // Limpiar datos del estado
    const limpiarDatosInspeccion = () => {
        setArticuloSeleccionado(null);
        setPlanSeleccionado(null);
        setReporteGenerado(null);
    }

    const limpiarArticulo = () => {
        setArticuloSeleccionado(null);
    }

    const limpiarPlan = () => {
        setPlanSeleccionado(null);
    }

    const limpiarReporte = () => {
        setReporteGenerado(null);
    }
    
    

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
        limpiarReporte
    }

    useEffect(() => {

        
        
    },[])
    
    return (
        <DesviacionContext.Provider
            value={data}
        >
            {children}
        </DesviacionContext.Provider>
    )
    
}

//HOOK

export function useDesviacion() {
   const context = useContext(DesviacionContext);

    if (!context) {
        throw new Error(
            'useDesviacion debe usarse dentro de DesviacionProvider'
        );
    }

    return context;
}