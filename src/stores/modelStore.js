import { defineStore } from "pinia";
import { getPresignedUploadUrl, uploadToS3, createModel,getModels,getModel,getPresignedDownloadUrl  } from "../services/apiServices";

export const useModelStore = defineStore("model", {
  state: () => ({
    models: [],
    presignedUrlData: null, // Dati ricevuti dal server (model_id, upload_url, video_uri)
    error: null,
    loading: false, // Stato di caricamento
    search: '', // Ricerca attiva
    page: 1, // Pagina attuale
    totalPages: 1, // Totale delle pagine (per la paginazione)
    itemsPerPage: 9, // Numero di modelli per pagina
  }),

  actions: {
    async requestPresignedUrl(file) {
      this.loading = true;
      this.error = null;

      try {
        this.presignedUrlData = await getPresignedUploadUrl(file.name, file.type);
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

    async fetchModels() {
      this.loading = true;
      try {
        const response = await getModels({
          page: this.page,
          limit: this.itemsPerPage,
          model_name: this.search,
        });
        this.models = response.models; // Popola la lista dei modelli
        this.totalPages = response.totalPages; // Calcola il totale delle pagine
      } catch (error) {
        console.error('Errore durante il recupero dei modelli:', error);
      } finally {
        this.loading = false;
      }
    },

    async getModel() {
      this.loading = true;
      try {
        const response = await getModel({
          modelId: this.modelId
        });
        this.models = response.models; // Popola la lista dei modelli
        this.totalPages = response.totalPages; // Calcola il totale delle pagine
      } catch (error) {
        console.error('Errore durante il recupero dei modelli:', error);
      } finally {
        this.loading = false;
      }
    },

    // Funzione per aggiornare la ricerca e rifare la chiamata
    updateSearch(newSearch) {
      this.search = newSearch;
      this.page = 1; // Ripristina la pagina a 1
      this.fetchModels(); // Ricarica i modelli
    },

    // Funzione per cambiare pagina
    changePage(newPage) {
      this.page = newPage;
      this.fetchModels(); // Ricarica i modelli per la nuova pagina
    },

    async downloadZipModel(modelId) {
      try {
        const response = await getModel(modelId)
        this.downloadUrl = response.output_url
    
        // Scaricare il file ZIP con Fetch API
        const zipResponse = await fetch(this.downloadUrl)
        const zipBlob = await zipResponse.blob()
    
        return zipBlob // Restituisce il file ZIP
      } catch (error) {
        console.error('Errore nel recupero del download URL:', error)
      }
    },

    
  }
})
