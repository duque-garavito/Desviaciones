import { API_BASE_URL } from '../../config';

const apiRoute=`${API_BASE_URL}/api/inspecciones/partes-produccion`


export const obtenerPlanDiaEspecie =async(especie)=>{
    try 
    {
        const esp=especie.trim()
        const response = await fetch(`${apiRoute}/?especie=${esp}`);
        const data = await response.json();
        if(!data.success) throw new Error(data.message);
        return {
            success:true,
            data:data.partes
        }
    }catch(error)
    {
        console.error('Error al obtener el plan diario:', error);
       return{
           error:true,
           message:error.message
       }
    }   
}