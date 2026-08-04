import { UPDATE_API_URL } from '../../config';

const apiRoute = `${UPDATE_API_URL}/api/version`;

const normalizarUrlDescarga = (downloadUrl) => {
  if (!downloadUrl) return null;
  if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;

  const origen = UPDATE_API_URL.replace(/\/+$/, '');
  const ruta = downloadUrl.replace(/\\/g, '/');

  return ruta.startsWith('/') ? `${origen}${ruta}` : `${origen}/${ruta}`;
};

//--- CONSULTA LA VERSION DEL SERVIDOR O BACKEND 
export const ConsultarVersionServidor = async () => {
  try {
    const res = await fetch(apiRoute);

    // --- ERROR 404 --  MODO PRUEBA AUN NO ESTA EMITIDO
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.success || !data?.data) return null;

    return {
      ...data.data,
      downloadUrl: normalizarUrlDescarga(data.data.downloadUrl),
    };
  } catch (error) {
    console.log('NO SE PUDO CONSULTAR LA VERSION DEL SERVIDOR:', error.message);
    return null;
  }
};
