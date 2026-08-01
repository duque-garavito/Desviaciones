import { API_BASE_URL } from '../../config';

const apiRoute=`${API_BASE_URL}/api/programacion`

export const ObtenerProgramacionPorUsuario=async(usuario)=>
{
    try
    {
        const resProg = await fetch(`${apiRoute}/usuario/${usuario}`);
         const dataProg = await resProg.json();
       
         return{
            success:true,
            data:dataProg
         }
    }
    catch(error)
    {
        console.error("Error al obtener la programación:",error)
        return {
            error:true,
            message:"Error al obtener la programación"
        }
    }
}