import axios from "axios";

const API_BASE_URL = "http://localhost:8000"; // Cambia con l'URL corretto

export const getPresignedUrl = async (filename, contentType) => {
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
