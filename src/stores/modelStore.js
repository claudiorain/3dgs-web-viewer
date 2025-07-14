import { defineStore } from "pinia";
import { getPresignedUploadUrl, uploadToS3, createModel, getModels, getModel, retryModel } from "../services/modelService";

export const useModelStore = defineStore("model", {
  state: () => ({
    models: [],
    presignedUrlData: null, // Dati ricevuti dal server (model_id, upload_url, video_s3_key)
    error: null,
    loading: false, // Stato di caricamento
    titleFilter: '', // Ricerca attiva
    statusFilter: null, // Aggiungi questo
    page: 1, // Pagina attuale
    totalCount: -1,
    pageCount: 1, // Totale delle pagine (per la paginazione)
    itemsPerPage: 9, // Numero di modelli per pagina
    selectedModel: null,
    phases: [
      { name: 'frame_extraction', label: 'Frames', icon: 'mdi-image-multiple' },
      { name: 'point_cloud_building', label: 'Point Cloud', icon: 'mdi-cube-scan' },
      { name: 'training', label: 'Training', icon: 'mdi-brain' },
      { name: 'upload', label: 'Upload', icon: 'mdi-upload' },
      { name: 'metrics_evaluation', label: 'Metrics', icon: 'mdi-chart-line' }
    ],
    phaseTimeline: [
  {
    value: 'frame_extraction',
    label: 'Frame Extraction',
    icon: 'mdi-image-multiple',
    color: 'blue'
  },
  {
    value: 'point_cloud_building',
    label: 'Point Cloud',
    icon: 'mdi-cube-scan',
    color: 'green'
  },
  {
    value: 'training',
    label: 'Training',
    icon: 'mdi-brain',
    color: 'orange'
  },
  {
    value: 'metrics',
    label: 'Metrics',
    icon: 'mdi-chart-line',
    color: 'purple'
  }
],
    statusFilterOpts: [
      { title: 'All', value: null },
      { title: 'Pending', value: 'PENDING' },
      { title: 'Running', value: 'RUNNING' },
      { title: 'Completed', value: 'COMPLETED' },
      { title: 'Failed', value: 'FAILED' },
    ],
    statusMap: {
      'PENDING': { color: 'grey', icon: 'mdi-clock-outline', text: 'Pending' },
      'RUNNING': { color: 'primary', icon: 'mdi-loading', text: 'Running' },
      'COMPLETED': { color: 'success', icon: 'mdi-check-circle', text: 'Completed' },
      'FAILED': { color: 'error', icon: 'mdi-alert-circle', text: 'Failed' }
    },
    metrics: [
      { key: 'ssim', title: 'SSIM' },
      { key: 'psnr', title: 'PSNR' },
      { key: 'lpips', title: 'LPIPS' },
    ],
    engineOpts: [
      {
        value: 'INRIA',
        label: 'INRIA',
        description: 'Original Gaussian Splatting implementation',
        icon: 'mdi-school',
        color: 'blue'
      },
      {
        value: 'TAMING',
        label: 'TAMING',
        description: 'Advanced training algorithm',
        icon: 'mdi-lightning-bolt',
        color: 'orange'
      },
      {
        value: 'MCMC',
        label: 'MCMC',
        description: 'Monte Carlo method for training',
        icon: 'mdi-dice-multiple',
        color: 'green'
      }],
    qualityLevelOpts: [
      {
        value: 'fast',
        label: 'Fast',
        short: 'Fast',
        description: 'Fast training with reduced quality. Good for testing and quick iterations.',
        time: '~15-20 min',
        icon: 'mdi-run-fast',
        color: 'grey',
        speed: 5,
        quality: 1,
        vram: 2
      },
      {
        value: 'balanced',
        label: 'Balanced',
        short: 'Balanced',
        description: 'Balanced training providing good quality in reasonable time. Recommended for most cases.',
        time: '~45-60 min',
        icon: 'mdi-balance-horizontal',
        color: 'blue',
        speed: 3,
        quality: 3,
        vram: 3
      },
      {
        value: 'quality',
        label: 'Quality',
        short: 'Quality',
        description: 'Enhanced training with improved detail capture. Takes longer but delivers better results.',
        time: '~90-120 min',
        icon: 'mdi-star',
        color: 'green',
        speed: 2,
        quality: 5,
        vram: 4
      }
      
    ],
    // ✨ NUOVO: Aggiungi questi campi
    isRefreshing: false,  // per indicare refresh in corso
    refreshTimeout: null  // per debounce
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

    async saveRetryModel(model_id) {
      try {
        const modelResponse = await retryModel(model_id);
        console.log(modelResponse)
        const modelIndex = this.models.findIndex(model => modelResponse._id === model_id);
        if (modelIndex !== -1) {
          // Aggiorna il modello esistente
          this.models[modelIndex] = modelResponse;
        } else {
          // Se per qualche motivo il modello non è nell'array, aggiungilo
          this.models.push(modelResponse);
        }
      } catch (error) {
        this.error = error;
        throw error;
      }
    },

    async saveReprocessingModel(parent_model_id, from_phase, title, description, engine, quality_level) {
      try {
        const modelData = {
          parent_model_id,
          from_phase,
          title,
          description,
          engine,
          quality_level
        };
        const newModel = await createModel(modelData);
        this.models.push(newModel);
      } catch (error) {
        this.error = error;
        throw error;
      }
    },

    async saveNewModel(title, description, engine, quality_level) {
      if (!this.presignedUrlData) {
        throw new Error("Nessun dato del modello disponibile!");
      }
      try {
        const modelData = {
          video_s3_key: this.presignedUrlData.video_s3_key,
          title,
          description,
          engine,
          quality_level
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
        const params = {
          page: this.page,
          limit: this.itemsPerPage,
          title: this.titleFilter,
        };

        // Aggiungi il filtro status se presente
        if (this.statusFilter) {
          params.status = this.statusFilter;
        }

        const response = await getModels(params);
        this.models = response.models;
        this.pageCount = response.totalPages;
        this.totalCount = response.totalCount;
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
        this.downloadUrl = response.zip_model_url

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
      return this.searchParams || { lastPage: 1, lastItemsPerPage: 9, lastSearch: '' };
    },
    setSelectedModel(model) {
      this.selectedModel = model;
    },

    async handleModelNotification(notification) {
      console.log(`🔄 Handling notification for model: ${notification.model_title}`)
      
      // Debounce per evitare refresh multipli se arrivano molte notifiche
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout)
      }
      
      this.refreshTimeout = setTimeout(() => {
        this.refreshCurrentPage()
      }, 1000) // Aspetta 1 secondo
    },

    // ✨ NUOVO: Refresh della pagina corrente
    async refreshCurrentPage() {
      if (this.isRefreshing) {
        console.log('🔄 Refresh already in progress, skipping...')
        return
      }

      this.isRefreshing = true
      console.log('🔄 Refreshing current page...')

      try {
        // Rifai esattamente la stessa query corrente
        // fetchModels() usa automaticamente i filtri, pagina e ordinamento correnti
        await this.fetchModels()
        console.log('✅ Page refreshed successfully')
      } catch (error) {
        console.error('❌ Error refreshing page:', error)
      } finally {
        this.isRefreshing = false
      }
    },

    // ✨ NUOVO: Cleanup quando si esce dalla pagina
    cleanupNotificationHandlers() {
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout)
        this.refreshTimeout = null
      }
      this.isRefreshing = false
    }
  }
})
