import {serverApi,s3Api} from './baseApi';


export const getPresignedUploadUrl = async (filename, contentType) => {
  try {
    const response = await serverApi.post(`/s3/upload-url/`, {
      filename,
      content_type: contentType,
    });
    return response.data; // { model_id, upload_url, video_s3_key }
  } catch (error) {
    console.error("Errore nel recupero del presigned URL:", error);
    throw error;
  }
};

export const createModel = async (modelData) => {
  try {
    const response = await serverApi.post(`/models/`, modelData);
    return response.data; // Modello creato
  } catch (error) {
    console.error("Errore nella creazione del modello:", error);
    throw error;
  }
};

export const uploadToS3 = async (uploadUrl, file) => {
  try {
    await s3Api.put(uploadUrl, file, {
      headers: { "Content-Type": file.type },
    });
    return true;
  } catch (error) {
    console.error("Errore nell'upload su S3:", error);
    throw error;
  }
};

// Gestisci le chiamate GET per ottenere i modelli
export const getModels = async ({ page = 1, limit = 10, title = '', status = [] }) => {
  try {
    const response = await serverApi.get('/models', {
      params: {
        page,
        limit,
        title,
        status,
      },
    });
    return response.data; // Restituisce i dati ricevuti dal backend
  } catch (error) {
    console.error('Errore durante la chiamata API:', error);
    throw error;
  }
};

// Gestisci la chiamata GET per ottenere il modello
export const getModel = async ( modelId ) => {
  try {
    const response = await serverApi.get(`/models/${modelId}`);
    return response.data; // Restituisce i dati ricevuti dal backend
  } catch (error) {
    console.error('Errore durante la chiamata API:', error);
    throw error;
  }
};


export const getPresignedDownloadUrl = async (modelId,resourceName) => {
  try {
    const response = await serverApi.get(`/models/${modelId}/${resourceName}/s3/download-url`)
    return response.data
  } catch (error) {
    console.error('Errore nel recupero del presigned URL:', error)
    throw error
  }
}
