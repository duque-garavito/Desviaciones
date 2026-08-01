import { useState } from "react";
import SeleccionArticulo from "../components/Inpeccion/SeleccionArticulo";
import { useDesviacion } from "../core/Context/DesviacionContext";

export default function InspeccionScreen() {
  const { articuloSelecccionado, reporteGenerado, planSeleccionado } =
    useDesviacion();

  return reporteGenerado && articuloSelecccionado ? (
    <div>
      {/* Aqui Va Mi pantalla de Inspeccion */}
      <div>Pantalla de Inspeccion</div>
    </div>
  ) : (
    <div>
      <SeleccionArticulo />
    </div>
  );
}
