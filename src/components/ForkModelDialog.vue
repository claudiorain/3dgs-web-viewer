<!-- ReprocessModelDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="700" persistent>
    <v-card>
      <v-card-title class="text-h5 pa-6">
        <v-icon class="mr-2">mdi-content-copy</v-icon>
        Reprocess Model
      </v-card-title>
      
      <v-card-text class="pa-6">
        <!-- Info modello sorgente -->
        <v-alert 
          type="info" 
          variant="tonal" 
          class="mb-6"
          prepend-icon="mdi-information">
          <div class="text-subtitle-2 mb-1">Source Model: {{ sourceModel?.title }}</div>
          <div class="text-caption">This will create a new model starting from the selected phase</div>
        </v-alert>

        <v-form ref="form" v-model="valid" @submit.prevent="submit">
          <v-row>
            <!-- Titolo -->
            <v-col cols="12">
              <v-text-field
                v-model="formData.title"
                label="Model Title"
                variant="outlined"
                density="comfortable"
                :rules="[rules.required]"
                prepend-inner-icon="mdi-format-title"
                required>
              </v-text-field>
            </v-col>

            <!-- Descrizione -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Description (optional)"
                variant="outlined"
                density="comfortable"
                rows="3"
                prepend-inner-icon="mdi-text">
              </v-textarea>
            </v-col>

            <!-- Start Phase Selector -->
            <v-col cols="12">
              <v-select
                v-model="formData.from_phase"
                label="Start from phase"
                variant="outlined"
                density="comfortable"
                :items="availablePhases"
                item-title="label"
                item-value="value"
                :rules="[rules.required]"
                prepend-inner-icon="mdi-play-circle"
                required>
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                    </template>
                    <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
                <template v-slot:selection="{ item }">
                  <v-chip :color="item.raw.color" variant="tonal" size="small" class="mr-2">
                    <v-icon start size="16">{{ item.raw.icon }}</v-icon>
                    {{ item.raw.label }}
                  </v-chip>
                </template>
              </v-select>
            </v-col>

            <!-- Engine Selector -->
            <v-col cols="12">
              <v-select
                v-model="formData.engine"
                label="Training Engine"
                variant="outlined"
                density="comfortable"
                :items="engines"
                item-title="label"
                item-value="value"
                :rules="[rules.required]"
                prepend-inner-icon="mdi-engine"
                required>
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                    </template>
                    <v-list-item-title>{{ item.raw.label }}</v-list-item-title>
                    <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
                <template v-slot:selection="{ item }">
                  <v-chip :color="item.raw.color" variant="tonal" size="small" class="mr-2">
                    <v-icon start size="16">{{ item.raw.icon }}</v-icon>
                    {{ item.raw.label }}
                  </v-chip>
                </template>
              </v-select>
            </v-col>

            <!-- Quality Selector -->
            <v-col cols="12">
              <div class="mb-2">
                <div class="d-flex align-center justify-space-between mb-2">
                  <label class="text-subtitle-2">
                    <v-icon class="mr-2">mdi-tune</v-icon>
                    Training Quality
                  </label>
                  <v-chip 
                    :color="currentQuality.color" 
                    variant="tonal" 
                    size="small">
                    <v-icon start size="16">{{ currentQuality.icon }}</v-icon>
                    {{ currentQuality.label }}
                  </v-chip>
                </div>
                
                <v-slider
                  v-model="formData.quality_index"
                  :min="0"
                  :max="2"
                  :step="1"
                  show-ticks="always"
                  tick-size="4"
                  track-color="grey-lighten-1"
                  :track-fill-color="currentQuality.color"
                  :thumb-color="currentQuality.color"
                  hide-details
                  class="quality-slider">
                  <template v-slot:tick-label="{ tick }">
                    <div class="text-center" v-if="qualityLevelOpts[tick]">
                      <v-icon 
                        :color="tick === formData.quality_index ? currentQuality.color : 'grey'"
                        size="18"
                        class="mb-1">
                        {{ qualityLevelOpts[tick].icon }}
                      </v-icon>
                      <div class="text-caption">{{ qualityLevelOpts[tick].short }}</div>
                    </div>
                  </template>
                </v-slider>
                
                <!-- Quality Info Card -->
                <v-card variant="outlined" class="mt-4 pa-4">
                  <div class="d-flex align-center mb-2">
                    <v-icon :color="currentQuality.color" class="mr-2">{{ currentQuality.icon }}</v-icon>
                    <span class="text-subtitle-2">{{ currentQuality.label }}</span>
                    <v-spacer></v-spacer>
                    <v-chip size="x-small" :color="currentQuality.color" variant="outlined">
                      {{ currentQuality.time }}
                    </v-chip>
                  </div>
                  <div class="text-body-2 mb-3">{{ currentQuality.description }}</div>
                  
                  <!-- Quality Metrics -->
                  <v-row dense>
                    <v-col cols="4">
                      <div class="text-center">
                        <v-icon size="20" class="mb-1" color="primary">mdi-speedometer</v-icon>
                        <div class="text-caption text-grey">Speed</div>
                        <v-rating
                          :model-value="currentQuality.speed"
                          readonly
                          density="compact"
                          size="x-small"
                          color="primary">
                        </v-rating>
                      </div>
                    </v-col>
                    <v-col cols="4">
                      <div class="text-center">
                        <v-icon size="20" class="mb-1" color="success">mdi-diamond-stone</v-icon>
                        <div class="text-caption text-grey">Quality</div>
                        <v-rating
                          :model-value="currentQuality.quality"
                          readonly
                          density="compact"
                          size="x-small"
                          color="success">
                        </v-rating>
                      </div>
                    </v-col>
                    <v-col cols="4">
                      <div class="text-center">
                        <v-icon size="20" class="mb-1" color="warning">mdi-memory</v-icon>
                        <div class="text-caption text-grey">VRAM</div>
                        <v-rating
                          :model-value="currentQuality.vram"
                          readonly
                          density="compact"
                          size="x-small"
                          color="warning">
                        </v-rating>
                      </div>
                    </v-col>
                  </v-row>
                </v-card>
              </div>
            </v-col>

            <!-- Phases Summary -->
            <v-col cols="12" v-if="formData.from_phase">
              <v-card variant="outlined" class="pa-4">
                <div class="text-subtitle-2 mb-3">
                  <v-icon class="mr-2">mdi-timeline</v-icon>
                  Processing Pipeline
                </div>
                
                <div class="d-flex flex-wrap gap-2">
                  <v-chip 
                    v-for="phase in allPhases" 
                    :key="phase.value"
                    :color="getPhaseChipColor(phase.value)"
                    :variant="getPhaseChipVariant(phase.value)"
                    size="small">
                    <v-icon start size="16">{{ phase.icon }}</v-icon>
                    {{ phase.label }}
                    <v-icon v-if="isPhaseReused(phase.value)" end size="16">mdi-cached</v-icon>
                  </v-chip>
                </div>
                
                <div class="text-caption mt-2 text-grey">
                  <v-icon size="16" class="mr-1">mdi-cached</v-icon>
                  Phases with cache icon will reuse existing results
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="cancel">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!valid"
          @click="submit"
          prepend-icon="mdi-play">
          Start Reprocessing
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useModelStore } from '@/stores/modelStore';

const props = defineProps({
  modelValue: Boolean,
  sourceModel: Object
});

const emit = defineEmits(['update:modelValue', 'reprocessed']);

const modelStore = useModelStore();
const { saveReprocessingModel ,qualityLevelOpts } = modelStore;

// State
const valid = ref(false);
const loading = ref(false);
const form = ref(null);

const formData = ref({
  title: '',
  description: '',
  from_phase: '',
  engine: 'INRIA',
  quality_index: 1  // Default: Standard
});

// Quality Levels Configuration (fix values to match backend enum)


// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const currentQuality = computed(() => {
  return qualityLevelOpts[formData.value.quality_index] || qualityLevelOpts[1];
});

// Definizione di tutte le fasi
const allPhases = [
  {
    value: 'frame_extraction',
    label: 'Frame Extraction',
    description: 'Extract frames from video',
    icon: 'mdi-image-multiple',
    color: 'blue'
  },
  {
    value: 'point_cloud_building',
    label: 'Point Cloud',
    description: 'Generate 3D point cloud with COLMAP',
    icon: 'mdi-cube-scan',
    color: 'green'
  },
  {
    value: 'depth_regularization',
    label: 'Depth Regularization',
    description: 'Depth',
    icon: 'mdi-cube-scan',
    color: 'pink'
  },
  {
    value: 'training',
    label: 'Training',
    description: 'Train Gaussian Splatting model',
    icon: 'mdi-brain',
    color: 'orange'
  }
];

// Fasi disponibili (solo quelle completate)
const availablePhases = computed(() => {
  if (!props.sourceModel?.phases) return [];
  
  const available = [];
  
  // ✅ Sempre includi frame_extraction come prima opzione
  available.push({
    ...allPhases[0], // frame_extraction
    description: 'Restart from beginning with new parameters'
  });
  
  allPhases.forEach(phase => {
    const phaseData = props.sourceModel.phases[phase.value];
    if (phaseData && ['COMPLETED', 'FAILED'].includes(phaseData.status)) {
      
      // ✅ CASO 1: Se la fase è completata, permetti di ripartire da quella fase
      if (phaseData.status === 'COMPLETED') {
        available.push({
          ...phase,
          description: `Restart from ${phase.label} (reuse previous phases)`
        });
      }
      
      // ✅ CASO 2: Se la fase è fallita, permetti di ripartire da quella fase
      if (phaseData.status === 'FAILED') {
        available.push({
          ...phase,
          description: `Retry ${phase.label} (reuse previous completed phases)`
        });
      }
      
      // ✅ CASO 3: Se fase completata e c'è una successiva, includi anche quella
      const currentIndex = allPhases.findIndex(p => p.value === phase.value);
      if (phaseData.status === 'COMPLETED' && currentIndex < allPhases.length - 1) {
        const nextPhase = allPhases[currentIndex + 1];
        available.push({
          ...nextPhase,
          description: `Start from ${nextPhase.label} (reuse ${phase.label})`
        });
      }
    }
  });
  
  // ✅ Rimuovi duplicati
  return available.filter((phase, index, self) => 
    index === self.findIndex(p => p.value === phase.value)
  );
});

// Engines disponibili
const engines = [
  {
    value: 'INRIA',
    label: 'INRIA',
    description: 'Original Gaussian Splatting implementation',
    icon: 'mdi-school',
    color: 'blue'
  },
  {
    value: 'MCMC',
    label: 'MCMC',
    description: 'Monte Carlo method for training',
    icon: 'mdi-dice-multiple',
    color: 'green'
  },
  {
    value: 'TAMING',
    label: 'TAMING',
    description: 'Advanced training algorithm',
    icon: 'mdi-lightning-bolt',
    color: 'orange'
  }
];

// Validation rules
const rules = {
  required: (value) => !!value || 'Field is required'
};

// Methods
function getPhaseChipColor(phaseValue) {
  if (!formData.value.from_phase) return 'grey';
  
  const fromPhaseIndex = allPhases.findIndex(p => p.value === formData.value.from_phase);
  const currentPhaseIndex = allPhases.findIndex(p => p.value === phaseValue);
  
  if (currentPhaseIndex < fromPhaseIndex) {
    return 'success'; // Reused phases
  } else if (currentPhaseIndex >= fromPhaseIndex) {
    return 'primary'; // New phases to execute
  }
  return 'grey';
}

function getPhaseChipVariant(phaseValue) {
  if (!formData.value.from_phase) return 'outlined';
  
  const fromPhaseIndex = allPhases.findIndex(p => p.value === formData.value.from_phase);
  const currentPhaseIndex = allPhases.findIndex(p => p.value === phaseValue);
  
  if (currentPhaseIndex < fromPhaseIndex) {
    return 'tonal'; // Reused phases
  } else if (currentPhaseIndex >= fromPhaseIndex) {
    return 'flat'; // New phases to execute
  }
  return 'outlined';
}

function isPhaseReused(phaseValue) {
  if (!formData.value.from_phase) return false;
  
  const fromPhaseIndex = allPhases.findIndex(p => p.value === formData.value.from_phase);
  const currentPhaseIndex = allPhases.findIndex(p => p.value === phaseValue);
  
  return currentPhaseIndex < fromPhaseIndex;
}

async function submit() {
  const { valid: isValid } = await form.value.validate();
  if (!isValid) return;

  loading.value = true;
  try {
    console.log( props.sourceModel)
    console.log( formData)
    const newModel = await saveReprocessingModel (
      props.sourceModel._id,
      formData.value.from_phase,
      formData.value.title,
      formData.value.description,
      formData.value.engine,
      currentQuality.value.value  // Passa il valore della qualità
    );

    emit('reprocessed', newModel);
    cancel();
  } catch (error) {
    console.error('Error creating reprocessed model:', error);
    // Mostra errore all'utente
  } finally {
    loading.value = false;
  }
}

function cancel() {
  isOpen.value = false;
  formData.value = {
    title: '',
    description: '',
    from_phase: '',
    engine: 'INRIA',
    quality_index: 1  // Reset to Standard
  };
  form.value?.resetValidation();
}

// Watch per aggiornare il titolo quando si apre il dialog
watch(() => props.sourceModel, (newModel) => {
  if (newModel && isOpen.value) {
    formData.value.title = `${newModel.title} - Reprocessed`;
  }
}, { immediate: true });

watch(isOpen, (newValue) => {
  if (newValue && props.sourceModel) {
    formData.value.title = `${props.sourceModel.title} - Reprocessed`;
  }
});
</script>

<style scoped>
.quality-slider {
  margin-top: 8px;
  margin-bottom: 8px;
}

.quality-slider :deep(.v-slider-track__tick) {
  opacity: 0.6;
}

.quality-slider :deep(.v-slider-track__tick--filled) {
  opacity: 1;
}
</style>