import { API_BASE_URL } from '../../config';

const apiRoute=`${API_BASE_URL}/api/inspecciones`


export const obtenerArticulos =async(params)=>
{
    try {
        const res = await fetch(`${apiRoute}/articulos?${params.toString()}`);
        const data = await res.json();

        if(!data.success){
            throw new Error (data.message)
        }
        return {
            success:true,
            articulos:data.articulos
        }
        
    } catch (error) {
        return{
            error:true,
            message:"Error al obtener la lista de articulos"
        }
    }

}




