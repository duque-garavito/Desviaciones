import {useState} from 'react';
import SeleccionarArticuloScreen from '../components/Inpeccion/SeleccionArticuloScreen';

export default function InspeccionScreen() {

  const [articuloSelecccionado, setArticuloSeleccionado] = useState(null);
  const [planDiario,setPlanDiario] = useState(null);
  const [reporteInfo,setReporteInfo]=useState(null);

  const area='RECE';

  const handleArticulo=(articulo)=>
  {
    setArticuloSeleccionado(articulo)
  }

  const handlePlandiario=(planDiario)=>{
    setPlanDiario(planDiario)
  }


  return (

        !articuloSelecccionado ? (
         <div>
              {/* Aqui Va Mi pantalla de Seleccion de Articulo */}
              <SeleccionarArticuloScreen onSeleccionar={handleArticulo} codArea={area} />
               
         </div>
        ):
        (
            <div>
               {/* Aqui Va Mi pantalla de Inspeccion */}
              
            </div>
        )
 
  )
}

