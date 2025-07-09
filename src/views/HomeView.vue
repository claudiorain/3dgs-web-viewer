<template>
  <div class="dashboard-container">
    <!-- Header senza v-app-bar -->
    <v-card elevation="1" class="header-card mb-4" rounded="0">
      <v-card-text class="py-4">
        <v-row align="center">
          <v-col>
            <div class="text-h5 font-weight-bold d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-cube-outline</v-icon>
              3D Models Dashboard
            </div>
          </v-col>
          <v-col cols="auto">
            <v-btn v-if="isLoggedIn" color="error" variant="outlined" @click="doLogout" prepend-icon="mdi-logout">
              Logout
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <div class="content-area">
      <v-container fluid class="pa-4">
        <!-- Loading State -->
        <div v-if="loading" class="d-flex justify-center align-center my-12">
          <div class="text-center">
            <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
            <div class="text-h6 mt-4">Loading models...</div>
          </div>
        </div>

        <v-data-iterator v-else :items="models" :items-per-page="itemsPerPage">
          <template v-slot:header>
            <v-card class="mb-4" elevation="1">
              <v-card-text class="py-3">
                <v-row align="center">
                  <v-col cols="12" md="4">
                    <v-text-field 
                      v-model="titleFilter" 
                      density="comfortable" 
                      placeholder="Search models..." 
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined" 
                      clearable 
                      hide-details 
                      @input="debounceSearch"
                      @click:clear="clearSearch">
                    </v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="statusFilter"
                      label="Filter by status"
                      :items="statusFilterOpts"
                      item-title="title"
                      item-value="value"
                      variant="outlined"
                      density="comfortable"
                      clearable
                      hide-details
                      @update:model-value="handleStatusFilterChange">
                    </v-select>
                  </v-col>
                  <v-col cols="12" md="4" class="text-right">
                    <v-btn color="primary" size="large" @click="openNewModelDialog" prepend-icon="mdi-plus">
                      New Model
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </template>

          <template v-slot:no-data>
            <v-card class="text-center pa-8" elevation="0">
              <v-icon size="64" color="grey-lighten-1">mdi-cube-off-outline</v-icon>
              <div class="text-h6 mt-4 mb-2">No models found</div>
              <div class="text-body-2 text-grey">
                {{ hasActiveFilters ? 'No models match the current filters' : 'Create your first 3D model to get started' }}
              </div>
              <div class="mt-4">
                <v-btn v-if="hasActiveFilters" color="secondary" variant="outlined" @click="clearAllFilters" class="mr-2">
                  Clear Filters
                </v-btn>
                <v-btn color="primary" @click="openNewModelDialog">Create Model</v-btn>
              </div>
            </v-card>
          </template>

          <template v-slot:default="{ items }">
            <v-row>
              <v-col v-for="item in items" :key="item.raw._id" cols="12" md="6" lg="4">
                <v-card class="model-card" elevation="2" hover>
                  <!-- Thumbnail with overlay -->
                  <div class="thumbnail-container">
                    <v-img 
                      :src="item.raw.thumbnail_url" 
                      lazy-src="/assets/16px_upscaled.png"
                      height="200" 
                      cover
                      crossorigin="anonymous"
                      class="model-thumbnail">
                      
                      <!-- Status overlay -->
                      <div class="status-overlay">
                        <v-chip 
                          :color="getStatusConfig(getStatus(item.raw)).color" 
                          variant="elevated" 
                          size="small"
                          class="status-chip"
                          :class="getStatusConfig(getStatus(item.raw)).color">
                          <v-icon start size="12" color="white">{{ getStatusConfig(getStatus(item.raw)).icon }}</v-icon>
                          <span class="text-white font-weight-medium">{{ getStatusConfig(getStatus(item.raw)).text }}</span>
                        </v-chip>
                      </div>

                      <!-- Engine badge -->
                      <div class="engine-badge">
                        <v-chip color="surface" variant="flat" size="small">
                          <v-icon start size="12">mdi-engine</v-icon>
                          {{ getEngine(item.raw) }}
                        </v-chip>
                      </div>

                      <!-- Progress bar for running models -->
                      <div v-if="getStatus(item.raw) === 'RUNNING'" class="progress-overlay">
                        <v-progress-linear 
                          :model-value="getProgress(item.raw)" 
                          color="primary" 
                          height="4">
                        </v-progress-linear>
                      </div>
                    </v-img>
                  </div>

                  <!-- Card content -->
                  <v-card-text class="pb-2">
                    <div class="text-h6 font-weight-medium mb-2 text-truncate">
                      {{ item.raw.title }}
                    </div>
                    
                    <div v-if="item.raw.description" class="text-body-2 text-grey mb-3 line-clamp-2">
                      {{ item.raw.description }}
                    </div>

                    <!-- Model info chips -->
                    <div class="mb-3">
                      <v-chip-group>
                        <v-chip size="small" variant="outlined" v-if="getFrameCount(item.raw)">
                          <v-icon start size="12">mdi-image-multiple</v-icon>
                          {{ getFrameCount(item.raw) }} frames
                        </v-chip>
                        <v-chip size="small" variant="outlined" v-if="getTotalDuration(item.raw) && getStatus(item.raw) === 'COMPLETED'">
                          <v-icon start size="12">mdi-clock-outline</v-icon>
                          Total: {{ formatDuration(getTotalDuration(item.raw)) }}
                        </v-chip>
                        <v-chip size="small" variant="outlined" v-if="getCreatedDate(item.raw)">
                          <v-icon start size="12">mdi-calendar</v-icon>
                          {{ formatDate(getCreatedDate(item.raw)) }}
                        </v-chip>
                      </v-chip-group>
                    </div>

                    <!-- Phase timeline -->
                    <div class="phase-timeline mb-3">
                      <div class="text-caption text-grey mb-1">Processing Pipeline</div>
                      <v-timeline density="compact" side="end" class="timeline-custom">
                        <v-timeline-item 
                          v-for="phase in getPhaseTimeline(item.raw)" 
                          :key="phase.name"
                          :dot-color="phase.color"
                          size="x-small"
                          class="timeline-item">
                          <div class="d-flex align-center justify-space-between">
                            <div class="d-flex align-center">
                              <v-icon size="12" :color="phase.color" class="mr-2">{{ phase.icon }}</v-icon>
                              <span class="text-caption">{{ phase.label }}</span>
                            </div>
                            <span v-if="phase.duration" class="text-caption text-grey ml-4">
                              {{ formatDuration(phase.duration) }}
                            </span>
                          </div>
                        </v-timeline-item>
                      </v-timeline>
                    </div>
                  </v-card-text>

                  <!-- Actions -->
                  <v-card-actions class="pt-0">
                    <v-btn 
                      v-if="item.raw.zip_model_url" 
                      color="primary" 
                      variant="flat"
                      @click="goTo3DView(item.raw)" 
                      prepend-icon="mdi-rotate-3d">
                      View 3D
                    </v-btn>
                    
                    <v-btn 
                      v-if="canClone(item.raw)" 
                      color="cyan-lighten-1" 
                      variant="outlined"
                      @click="openCloneDialog(item.raw)" 
                      prepend-icon="mdi-content-copy">
                      Clone
                    </v-btn>

                    <v-btn 
                      v-if="canRetry(item.raw)" 
                      color="amber-darken-3" 
                      variant="outlined"
                      @click="retry(item.raw)" 
                      prepend-icon="mdi-restart">
                      Retry
                    </v-btn>

                    <v-spacer></v-spacer>

                    <v-btn 
                      v-if="hasMetrics(item.raw)"
                      :icon="show[item.raw._id] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                      variant="text"
                      @click="show[item.raw._id] = !show[item.raw._id]">
                    </v-btn>
                  </v-card-actions>

                  <!-- Expandable metrics -->
                  <v-expand-transition v-if="hasMetrics(item.raw)">
                    <div v-show="show[item.raw._id]">
                      <v-divider></v-divider>
                      <v-card-text>
                        <div class="text-subtitle-2 mb-3">Quality Metrics</div>
                        <v-row dense>
                          <v-col v-for="metric in metrics" :key="metric.key" cols="4">
                            <div class="metric-card">
                              <div class="text-h6 font-weight-bold">
                                {{ roundMetric(getMetrics(item.raw)[metric.key],metric.key) }}
                              </div>
                              <div class="text-caption text-grey">{{ metric.title }}</div>
                            </div>
                          </v-col>
                        </v-row>
                      </v-card-text>
                    </div>
                  </v-expand-transition>
                </v-card>
              </v-col>
            </v-row>
          </template>

          <template v-slot:footer>
            <v-card class="mt-4" elevation="1">
              <v-card-text class="py-3">
                <div class="d-flex align-center justify-center">
                  <v-btn 
                    :disabled="page === 1" 
                    icon="mdi-arrow-left" 
                    variant="outlined" 
                    color="primary"
                    @click="changePage(page - 1)">
                  </v-btn>

                  <div class="mx-6 text-body-1 font-weight-medium color-primary">
                    Page {{ page }} of {{ pageCount }}
                  </div>

                  <v-btn 
                    :disabled="page >= pageCount" 
                    icon="mdi-arrow-right" 
                    variant="outlined" 
                    color="primary"
                    @click="changePage(page + 1)">
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </template>
        </v-data-iterator>
      </v-container>
    </div>

    <!-- Dialogs -->
    <NewModelDialog v-model="isNewModelDialogOpen" />
    <CloneModelDialog v-model="isCloneModelDialogOpen" :sourceModel="selectedModel" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useModelStore } from '@/stores/modelStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router'
import NewModelDialog from '@/components/NewModelDialog.vue';
import CloneModelDialog from '@/components/CloneModelDialog.vue';
import { storeToRefs } from 'pinia';
import { useMetrics } from '@/utils/useMetrics'
import { useTimes } from '@/utils/useTimes'

const modelStore = useModelStore();
const authStore = useAuthStore();
const router = useRouter()

// Estrai valori reattivi dallo store
const { models, titleFilter, loading, page, pageCount, itemsPerPage, 
  statusFilter, statusFilterOpts, statusMap, phases, metrics } = storeToRefs(modelStore);
const { fetchModels, getSearchParams, setSearchParams, saveRetryModel } = modelStore;
 const { roundMetric, getMetricColor } = useMetrics()
 const { formatDate, formatDuration } = useTimes()

const { token } = storeToRefs(authStore);
const { logout } = authStore;

const isNewModelDialogOpen = ref(false);
const isCloneModelDialogOpen = ref(false);
const selectedModel = ref(null);
const show = ref({});

// Variabili locali
let searchTimeout = null;

// Computed per verificare se ci sono filtri attivi
const hasActiveFilters = computed(() => {
  return titleFilter.value || statusFilter.value;
});

// Debounce per la ricerca
function debounceSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 500); // 500ms di debounce
}

// Applica i filtri e ricarica i dati
async function applyFilters() {
  // Reset alla prima pagina quando si applicano i filtri
  page.value = 1;
  
  // Ricarica i dati - fetchModels usa automaticamente titleFilter.value e statusFilter.value
  await fetchModels();
}

// Handler per il cambio del filtro status - SEMPLIFICATO
async function handleStatusFilterChange() {
  console.log('Status filter changed to:', statusFilter.value);
  await applyFilters();
}

// Pulisce la ricerca
async function clearSearch() {
  titleFilter.value = '';
  await applyFilters();
}

// Pulisce tutti i filtri
async function clearAllFilters() {
  titleFilter.value = '';
  statusFilter.value = null;
  await applyFilters();
}

// ===== HELPER FUNCTIONS =====

function getEngine(model) {
  return model.training_config?.engine || 'INRIA';
}

function getStatus(model) {
  return model.overall_status || 'PENDING';
}

function getStatusConfig(status) {
  return statusMap.value[status] || statusMap.value['PENDING'];
}

function getFrameCount(model) {
  return model.phases?.frame_extraction?.metadata?.frame_count;
}

function getTotalDuration(model) {
  let total = 0;
  const phases = model.phases || {};
  
  Object.values(phases).forEach(phase => {
    if (phase.metadata?.training_duration_seconds) {
      total += phase.metadata.training_duration_seconds;
    } else if (phase.metadata?.colmap_duration_seconds) {
      total += phase.metadata.colmap_duration_seconds;
    }
  });
  
  return total > 0 ? total : null;
}

function getProgress(model) {
  const phase_keys = phases.value.map(ph => ph.name)
  const completedPhases = phase_keys.filter(phase => 
    model.phases?.[phase]?.status === 'COMPLETED'
  ).length;
  
  return (completedPhases / phases.value.length) * 100;
}

function getPhaseTimeline(model) {
  return phases.value.map(phase => {
    const phaseData = model.phases?.[phase.name];
    let color = 'grey-lighten-2';
    let duration = null;

    if (phaseData) {
      color = statusMap.value[phaseData.status]?.color || 'grey-lighten-2';
      // Calculate duration
      if (phaseData.started_at && phaseData.completed_at) {
        const start = new Date(phaseData.started_at);
        const end = new Date(phaseData.completed_at);
        duration = (end - start) / 1000; // seconds
      }
    }

    return { ...phase, color, duration };
  });
}

function getCreatedDate(model) {
  return model.created_at;
}



function hasMetrics(model) {
  return getMetrics(model) !== null;
}

function getMetrics(model) {
  return model.phases?.metrics_evaluation?.metadata?.metrics || null;
}

function canClone(model) {
  return ['COMPLETED','FAILED'].includes(model.phases?.frame_extraction?.status)
}

function canRetry(model) {
  return ['FAILED'].includes(model.overall_status)
}

function openNewModelDialog() {
  isNewModelDialogOpen.value = true;
}

function openCloneDialog(model) {
  selectedModel.value = model;
  isCloneModelDialogOpen.value = true;
}

function goTo3DView(model) {
  setSearchParams({
    lastSearch: titleFilter.value,
    lastPage: page.value,
    lastItemsPerPage: itemsPerPage.value,
    lastStatusFilter: statusFilter.value,
  });

  const routeData = router.resolve({ path: `/model/threejs/${model._id}` });
  window.open(routeData.href, '_blank');
}

async function changePage(newPage) {
  page.value = newPage;
  await fetchModels();
}

async function retry(model) {
  loading.value = true;
  try {
    const retryModel = await saveRetryModel(model._id);
    // Ricarica i dati dopo il retry
    await fetchModels();
  } catch (error) {
    console.error('Error creating reprocessed model:', error);
    // Mostra errore all'utente
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const { lastPage, lastItemsPerPage, lastSearch, lastStatusFilter } = getSearchParams();
  if (lastPage) {
    page.value = lastPage;
    itemsPerPage.value = lastItemsPerPage;
    titleFilter.value = lastSearch || '';
    statusFilter.value = lastStatusFilter || null;
  }
  
  // Carica i dati (fetchModels userà automaticamente i valori correnti)
  await fetchModels();
});

const round = (val) => {
  return parseFloat(val.toFixed(3));
}

const doLogout = () => {
  logout()
  router.push('/login')
}

const isLoggedIn = computed(() => !!token.value)

</script>

<style scoped>
.header-card {
  position: sticky;
  top: 0;
  z-index: 10;
}

.content-area {
  flex: 1;
}

.dashboard-container {
  min-height: 100vh;
  background-color: #fafafa;
}

.model-card {
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.model-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
}

.thumbnail-container {
  position: relative;
  overflow: hidden;
}

.model-thumbnail {
  transition: transform 0.3s ease;
}

.model-card:hover .model-thumbnail {
  transform: scale(1.05);
}

.status-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
}

.engine-badge {
  position: absolute;
  top: 8px;
  left: 8px;
}

.progress-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.status-chip {
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.timeline-custom {
  padding: 0;
}

.timeline-item {
  min-height: 24px !important;
}

.metric-card {
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  background: rgba(0,0,0,0.02);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.phase-timeline {
  max-height: 120px;
  overflow-y: auto;
}

.color-primary {
  color: rgb(var(--v-theme-primary)) !important;
}
</style>