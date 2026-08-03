
import SeleccionArticulo from "../components/Inpeccion/SeleccionArticulo";
import { useDesviacion } from "../core/Context/DesviacionContext";
import Formulario from "../components/Inpeccion/Formulario";

export default function InspeccionScreen() {
  const { articuloSeleccionado, reporteGenerado } =
    useDesviacion();

  return reporteGenerado && articuloSeleccionado ? (
    <div>
      {/* Aqui Va Mi pantalla de Inspeccion */}
      <Formulario />
    </div>
  ) : (
    <div>
      <SeleccionArticulo />
    </div>
  );
}
