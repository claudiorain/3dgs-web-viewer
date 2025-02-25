<template>
  <v-card>
    <div v-if="loading" class="d-flex justify-center align-center my-4">
      <v-progress-circular indeterminate></v-progress-circular>
    </div>
    

    
    <v-data-iterator 
      :items="models" 
      :items-per-page.sync="itemsPerPage" 
      :search="search" 
      :page.sync="page">
      <template v-slot:header>
        <v-toolbar class="px-2">
          <v-text-field v-model="search" density="comfortable" placeholder="Search" prepend-inner-icon="mdi-magnify"
            style="max-width: 300px;" variant="solo" clearable hide-details @input="updateSearch"></v-text-field>

          <v-spacer></v-spacer>

          <v-btn color="primary" @click="toggleModal">
            New model
          </v-btn>
        </v-toolbar>
      </template>

      <template v-slot:no-data>
        <v-row dense>
          <v-col cols="12" class="text-center py-4">
            <v-alert type="info" variant="tonal">
              No models found.
            </v-alert>
          </v-col>
        </v-row>
      </template>
      <template v-slot:default="{ items }">
        <v-container class="pa-2" fluid>
          <v-row dense>
            <v-col v-for="item in items" :key="item.raw._id" cols="auto" md="4">
              <v-card class="pb-3" border flat>
                <v-img lazy-src="/assets/16px_upscaled.png" aspect-ratio="16/9" max-height="125" cover :src="item.raw.thumbnail_url"
                  crossorigin="anonymous"></v-img>
                <v-list-item class="mb-2">
                  <template v-slot:title>
                    <strong class="text-h6 mb-2">{{ item.raw.title }}</strong>
                  </template>
                </v-list-item>

                <div class="d-flex justify-space-between align-center px-4">
                  <v-chip :color="statusColor(item.raw.status)" class="me-2">
                    {{ statusText(item.raw.status) }}
                  </v-chip>

                  <v-btn v-if="item.raw.output_url" color="primary" @click="$router.push('/model/' + item.raw._id)">
                    3D Model
                  </v-btn>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </template>

      <template v-slot:footer>
        <div class="d-flex align-center justify-center pa-4">
          <v-btn :disabled="page === 1" density="comfortable" icon="mdi-arrow-left" variant="tonal" rounded
            @click="changePage(page - 1)"></v-btn>

          <div class="mx-2 text-caption">
            Page {{ page }} of {{ pageCount }}
          </div>

          <v-btn :disabled="page >= pageCount" density="comfortable" icon="mdi-arrow-right" variant="tonal" rounded
            @click="changePage(page + 1)"></v-btn>

        </div>
      </template>
    </v-data-iterator>

    <!-- Modale per l'upload -->
    <ModelUploadModal v-model="isModalOpen" />
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useModelStore } from '@/stores/modelStore';
import ModelUploadModal from '@/components/ModelUploadModal.vue';
import { storeToRefs } from 'pinia';

const store = useModelStore();

// Estrai valori reattivi dallo store
const { models, search, loading, totalCount, page, pageCount, itemsPerPage } = storeToRefs(store);

// Estrai azioni dallo store
const { fetchModels, updateSearch } = store;

const isModalOpen = ref(false);

function toggleModal() {
  isModalOpen.value = !isModalOpen.value;
}

function statusColor(status) {
  switch (status) {
    case "PENDING":
      return 'secondary'
    case "COMPLETED":
      return 'success'
    case "VIDEO_PROCESSING":
      return 'warning'
    case "MODEL_TRAINING":
      return 'primary'
    case "POINT_CLOUD_TRAINING":
      return 'orange'
    default:
      return 'error'
  }
}

function statusText(status) {
  switch (status) {
    case "QUEUED":
      return 'Queued'
    case "COMPLETED":
      return 'Completed'
    case "VIDEO_PROCESSING":
      return 'Video processing'
    case "MODEL_TRAINING":
      return 'Training'
    case "POINT_CLOUD_RECONSTRUCTION":
      return 'Point cloud reconstruction'
    default:
      return 'Failed'
  }
}

// Cambia pagina e forza il ricaricamento
async function changePage(newPage) {
  console.log(`Cambio pagina a: ${newPage}`);
  page.value = newPage;
  await fetchModels();
  console.log(`Dopo fetchModels - Pagina: ${page.value}, Models: ${models.value.length}`);
}

// Carica i dati iniziali
onMounted(async () => {
  await fetchModels();
  console.log(`Dati iniziali caricati - Pagina: ${page.value}, Models: ${models.value.length}`);
});


</script>

<style scoped></style>