import { defineStore } from "pinia";
import { getPresignedUrl, uploadToS3, createModel } from "../services/apiServices";

export const useModelStore = defineStore("model", {
  state: () => ({
    models: [],
    presignedUrlData: null, // Dati ricevuti dal server (model_id, upload_url, video_uri)
    loading: false,
    error: null,
  }),

  actions: {
    async requestPresignedUrl(file) {
      this.loading = true;
      this.error = null;

      try {
        this.presignedUrlData = await getPresignedUrl(file.name, file.type);
      } catch (error) {
        this.error = error;
      } finally {
        this.loading = false;
      }
    },

    async uploadFileToS3(file) {
      if (!this.presignedUrlData) {
        throw new Error("Presigned URL non disponibile!");
      }
      try {
        await uploadToS3(this.presignedUrlData.upload_url, file);
      } catch (error) {
        this.error = error;
        throw error;
      }
    },

    async saveModel(title) {
      if (!this.presignedUrlData) {
        throw new Error("Nessun dato del modello disponibile!");
      }
      try {
        const modelData = {
          model_id: this.presignedUrlData.model_id,
          video_uri: this.presignedUrlData.video_uri,
          title,
        };
        const newModel = await createModel(modelData);
        this.models.push(newModel);
      } catch (error) {
        this.error = error;
        throw error;
      }
    },
  },
})
