<template>
  <v-card>
    <v-data-iterator :items="models" :items-per-page="itemsPerPage" :search="search" @update:page="changePage">
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

            <v-col v-for="item in items" :key="item.raw.title" cols="auto" md="4">
              <v-card class="pb-3" border flat>

                <v-img aspect-ratio="16/9" max-height="125" cover :src="item.raw.thumbnail_url"
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

      <template v-slot:footer="{ page, pageCount, prevPage, nextPage }">
        <div class="d-flex align-center justify-center pa-4">
          <v-btn :disabled="page === 1" density="comfortable" icon="mdi-arrow-left" variant="tonal" rounded
            @click="prevPage"></v-btn>

          <div class="mx-2 text-caption">
            Page {{ page }} of {{ pageCount }}
          </div>

          <v-btn :disabled="page >= pageCount" density="comfortable" icon="mdi-arrow-right" variant="tonal" rounded
            @click="nextPage"></v-btn>
        </div>
      </template>
    </v-data-iterator>

    <!-- Modale per l'upload -->
    <ModelUploadModal v-model="isModalOpen" />
  </v-card>
</template>


<script setup>
import { ref, onMounted } from 'vue';
import { useModelStore } from '@/stores/modelStore'; // Importa il nostro store Pinia
import ModelUploadModal from '@/components/ModelUploadModal.vue'; // Importa il modale
import { storeToRefs } from 'pinia';

const store = useModelStore(); // Crea l'istanza dello store

// 🔥 storeToRefs SOLO su valori reattivi dello store
const { models, search, loading, page, totalPages, itemsPerPage } = storeToRefs(store);

const { fetchModels, updateSearch, changePage, requestThumbnailUrl } = store;

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
    default:
      return 'Failed'
  }
}
// Esegui la chiamata per recuperare i modelli quando il componente viene montato
onMounted(fetchModels);

// Computed property per ottenere la src dell'immagine

</script>

<style scoped></style>
