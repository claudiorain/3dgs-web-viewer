import axios from "axios";

const API_BASE_URL = "http://localhost:8000"; // Cambia con l'URL corretto

export const getPresignedUploadUrl = async (filename, contentType) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/s3/upload-url/`, {
      filename,
      content_type: contentType,
    });
    return response.data; // { model_id, upload_url, video_uri }
  } catch (error) {
    console.error("Errore nel recupero del presigned URL:", error);
    throw error;
  }
};

export const createModel = async (modelData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/models/`, modelData);
    return response.data; // Modello creato
  } catch (error) {
    console.error("Errore nella creazione del modello:", error);
    throw error;
  }
};

export const uploadToS3 = async (uploadUrl, file) => {
  try {
    await axios.put(uploadUrl, file, {
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
    const response = await axios.get(`${API_BASE_URL}/models`, {
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
    const response = await axios.get(`${API_BASE_URL}/models/${modelId}`);
    return response.data; // Restituisce i dati ricevuti dal backend
  } catch (error) {
    console.error('Errore durante la chiamata API:', error);
    throw error;
  }
};


export const getPresignedDownloadUrl = async (modelId,resourceName) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/models/${modelId}/${resourceName}/s3/download-url`)
    return response.data
  } catch (error) {
    console.error('Errore nel recupero del presigned URL:', error)
    throw error
  }
}
