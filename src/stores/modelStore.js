import { defineStore } from "pinia";
import { getPresignedUploadUrl, uploadToS3, createModel,getModels,getModel,getPresignedDownloadUrl  } from "../services/apiServices";

export const useModelStore = defineStore("model", {
  state: () => ({
    models: [],
    presignedUrlData: null, // Dati ricevuti dal server (model_id, upload_url, video_s3_key)
    error: null,
    loading: false, // Stato di caricamento
    search: '', // Ricerca attiva
    page: 1, // Pagina attuale
    totalCount: -1,
    pageCount: 1, // Totale delle pagine (per la paginazione)
    itemsPerPage: 9, // Numero di modelli per pagina
    selectedModel: null
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

    async saveModel(title,description,engine) {
      if (!this.presignedUrlData) {
        throw new Error("Nessun dato del modello disponibile!");
      }
      try {
        const modelData = {
          model_id: this.presignedUrlData.model_id,
          video_s3_key: this.presignedUrlData.video_s3_key,
          title,
          description,
          engine
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
        this.pageCount = response.totalPages; // Calcola il totale delle pagine
        this.totalCount = response.totalCount; // Calcola il totale dei modelli
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
        this.pageCount = response.totalPages; // Calcola il totale delle pagine
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


    async downloadZipModel(modelId) {
      try {
        const response = await getModel(modelId)
        this.selectedModel = response
        this.downloadUrl = response.output_url
    
        // Scaricare il file ZIP con Fetch API
        const zipResponse = await fetch(this.downloadUrl)

        if (!zipResponse.ok) {
          throw new Error('Errore nel download del file, risposta non valida');
        }
        
      // Ora converte il Blob in un ArrayBuffer (necessario per JSZip)
        const zip = await zipResponse.arrayBuffer();
        return zip // Restituisce il file ZIP
      } catch (error) {
        console.error('Errore nel recupero del download URL:', error)
      }
    },

    setSearchParams(params) {
      this.searchParams = params;
    },
    getSearchParams() {
      return this.searchParams || {lastPage: 1,lastItemsPerPage:9,lastSearch: ''};
    },
    setSelectedModel(model) {
      this.selectedModel = model;
    },

    
  }
})
