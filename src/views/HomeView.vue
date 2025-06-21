<template>
  <v-btn v-if="isLoggedIn" color="error" class="ml-4" @click="doLogout">
    Logout
  </v-btn>
  <v-card>
    <div v-if="loading" class="d-flex justify-center align-center my-4">
      <v-progress-circular indeterminate></v-progress-circular>
    </div>



    <v-data-iterator :items="models" :items-per-page="itemsPerPage" :search="search">
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
                <v-img lazy-src="/assets/16px_upscaled.png" min-height="200" max-height="250" aspect-ratio="16/9" cover
                  :src="item.raw.thumbnail_url" crossorigin="anonymous" class="model-image">
                  <v-container >
                    <v-row dense>
                      <v-col cols="6" align="left">
                        <v-chip color="white"  variant="flat">
                          <span class="text-grey-darken-2 font-weight-medium">{{ item.raw.engine }}</span>
                        </v-chip>
                      </v-col>
                      <v-col cols="6" align="right">
                        <v-chip color="white" :class="statusColor(item.raw.status)" variant="flat">
                          <v-icon size="36">mdi-circle-small</v-icon>
                          <span>{{ statusText(item.raw.status) }}</span>
                        </v-chip>
                      </v-col>
                    </v-row>
                  </v-container>
                </v-img>

                <v-card-title>
                  <strong class="text-h5 mb-2 font-weight-medium">{{ item.raw.title }}</strong>
                </v-card-title>
                <v-card-actions>
                  <!-- <v-btn v-if="item.raw.output_url" color="primary"
                    @click="$router.push('/model/babylonjs/' + item.raw._id)">
                    BabylonJs 3D View
                  </v-btn> -->
                  <v-btn v-if="item.raw.output_url" density="comfortable" color="secondary" rounded="lg" size="x-large"
                    variant="flat" @click="goTo3DView(item.raw)" prepend-icon="mdi-rotate-3d">
                    View
                  </v-btn>
                </v-card-actions>
                <v-divider v-if="item.raw.results"></v-divider>
                <v-card-actions v-if="item.raw.results">
                  <v-btn text="Quality metrics"></v-btn>

                  <v-spacer></v-spacer>

                  <v-btn :icon="show[item.raw._id] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    @click="show[item.raw._id] = !show[item.raw._id]"></v-btn>
                </v-card-actions>
                <v-expand-transition v-if="item.raw.results">
                  <div v-show="show[item.raw._id]">
                    <v-container fluid>
                      <v-row cols="12">
                        <v-col cols="4" v-for="metric in metrics" :key="metric.key">
                          <v-sheet rounded="lg" color="grey-lighten-5" height="100" width="100"
                            class="pa-4 text-center mx-auto">
                            <h2 class="text-h6 mb-6">{{ round(item.raw.results[metric.key]) }}</h2>
                            <p class="pt-0">{{ metric.title }}</p>
                          </v-sheet>
                        </v-col>
                      </v-row>
                    </v-container>



                  </div>
                </v-expand-transition>

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
import { ref, onMounted, computed } from 'vue';
import { useModelStore } from '@/stores/modelStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router'
import ModelUploadModal from '@/components/ModelUploadModal.vue';
import { storeToRefs } from 'pinia';

const modelStore = useModelStore();
const authStore = useAuthStore();

const router = useRouter()

// Estrai valori reattivi dallo store
const { models, search, loading, page, pageCount, itemsPerPage } = storeToRefs(modelStore);
const { fetchModels, updateSearch, getSearchParams, setSearchParams } = modelStore;

const { token } = storeToRefs(authStore);
const { logout } = authStore;

// Estrai azioni dallo store

const isModalOpen = ref(false);
const show = ref({});


const metrics = [
  { key: 'ssim', title: 'SSIM' },
  { key: 'psnr', title: 'PSNR' },
  { key: 'lpips', title: 'LPIPS' },
]


function toggleModal() {
  isModalOpen.value = !isModalOpen.value;
}

function statusColor(status) {
  switch (status) {
    case "PENDING":
      return 'text-secondary'
    case "COMPLETED":
      return 'text-success'
    case "VIDEO_PROCESSING":
      return 'text-warning'
    case "MODEL_TRAINING":
      return 'text-primary'
    case "POINT_CLOUD_RECONSTRUCTION":
      return 'text-orange'
    case "METRICS_GENERATION":
      return 'text-purple'
    default:
      return 'text-error'
  }
}

function goTo3DView(model) {
  // Salva i parametri di ricerca nello store (Pinia)
  setSearchParams({
    lastSearch: search.value,
    lastPage: page.value,
    lastItemsPerPage: itemsPerPage.value,
  });

  // Naviga alla vista 3D con l'ID del modello
  const routeData = router.resolve({ path: `/model/threejs/${model._id}` }); // oppure { path: '/about' }
  window.open(routeData.href, '_blank');
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
    case "METRICS_GENERATION":
      return 'Generating metrics'
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
  const { lastPage, lastItemsPerPage, lastSearch } = getSearchParams();
  if (page) {
    page.value = lastPage;
    itemsPerPage.value = lastItemsPerPage;
    search.value = lastSearch
  }

  console.log(Array.isArray(models.value) ? 'models is an array' : 'models is not an array');
  await fetchModels();
  console.log(`Dati iniziali caricati - Pagina: ${page.value}, Models: ${models.value.length}`);
});


const round = (val) => {
  return parseFloat(val.toFixed(3));
}

const doLogout = () => {
  logout()
  // Reindirizza alla pagina di login
  router.push('/login')
}

// Computed property che verifica se l'utente è loggato
const isLoggedIn = computed(() => !!token.value) // ✅ REATTIVO


</script>

<style scoped></style>