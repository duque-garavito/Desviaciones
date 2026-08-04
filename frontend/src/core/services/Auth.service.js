
import { API_BASE_URL } from "../../config";

const apiRoute = `${API_BASE_URL}/api/usuarios`;

export const ObtenerTurnoDia=async(usuario)=>
{

    try {
        
        const response = await fetch(`${apiRoute}/turno`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ usuario })
        });

        const data = await response.json();
        if(!data.success) throw new Error(data.message);

        return data;
    } catch (error) {
        console.error("❌ Error al obtener turno", error);
        return null;
    }
    

}