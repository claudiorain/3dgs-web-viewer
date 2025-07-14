<!-- NewModelDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="600" persistent>
    <v-card>
      <v-card-title class="text-h5 pa-6">
        <v-icon class="mr-2">mdi-plus-circle</v-icon>
        Create New Model
      </v-card-title>
      
      <v-card-text class="pa-6">
        <!-- Info -->
        <v-alert 
          type="info" 
          variant="tonal" 
          class="mb-6"
          prepend-icon="mdi-information">
          <div class="text-subtitle-2 mb-1">Upload a video to create a new 3D model</div>
          <div class="text-caption">The video will be processed to extract frames, build a point cloud, and train a Gaussian Splatting model</div>
        </v-alert>

        <v-form ref="form" v-model="valid" @submit.prevent="submit">
          <v-row>
            <!-- File Upload -->
            <v-col cols="12">
              <v-card variant="outlined" class="pa-4">
                <div class="text-subtitle-2 mb-3">
                  <v-icon class="mr-2">mdi-video</v-icon>
                  Select Video File
                </div>
                <input 
                  type="file" 
                  @change="handleFileChange" 
                  accept="video/*" 
                  class="mb-2" />
                <div class="text-caption text-grey" v-if="selectedFile">
                  <v-icon size="16" class="mr-1">mdi-check-circle</v-icon>
                  Selected: {{ selectedFile.name }}
                </div>
              </v-card>
            </v-col>

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

            <!-- Engine Selector -->
            <v-col cols="12">
              <v-select
                v-model="formData.engine"
                label="Training Engine"
                variant="outlined"
                density="comfortable"
                :items="engineOpts"
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

            <!-- Quality Selector - AGGIUNTO -->
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

            <!-- Processing Pipeline Preview -->
            <v-col cols="12" v-if="formData.engine">
              <v-card variant="outlined" class="pa-4">
                <div class="text-subtitle-2 mb-3">
                  <v-icon class="mr-2">mdi-timeline</v-icon>
                  Processing Pipeline
                </div>
                
                <div class="d-flex flex-wrap gap-2">
                  <v-chip 
                    v-for="phase in phaseTimeline" 
                    :key="phase.value"
                    :color="phase.color"
                    variant="flat"
                    size="small">
                    <v-icon start size="16">{{ phase.icon }}</v-icon>
                    {{ phase.label }}
                  </v-chip>
                </div>
                
                <div class="text-caption mt-2 text-grey">
                  <v-icon size="16" class="mr-1">mdi-information</v-icon>
                  All phases will be executed in sequence starting from frame extraction
                </div>
              </v-card>
            </v-col>

            <!-- Upload Progress -->
            <v-col cols="12" v-if="uploadProgress > 0 && uploadProgress < 100">
              <v-card variant="outlined" class="pa-4">
                <div class="text-subtitle-2 mb-2">
                  <v-icon class="mr-2">mdi-cloud-upload</v-icon>
                  Uploading Video...
                </div>
                <v-progress-linear 
                  :model-value="uploadProgress" 
                  height="8" 
                  rounded 
                  color="primary">
                </v-progress-linear>
                <div class="text-caption mt-1">{{ uploadProgress }}% completed</div>
              </v-card>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="cancel"
          :disabled="loading">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!valid || !selectedFile"
          @click="submit"
          prepend-icon="mdi-rocket-launch">
          Create Model
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useModelStore } from '@/stores/modelStore';
import { storeToRefs } from 'pinia';

const props = defineProps({
  modelValue: Boolean
});

const emit = defineEmits(['update:modelValue', 'created']);

const modelStore = useModelStore();
const { requestPresignedUrl, uploadFileToS3, saveNewModel } = modelStore;

// Estrai valori reattivi dallo store
const { engineOpts,qualityLevelOpts,phaseTimeline } = storeToRefs(modelStore);


// State
const valid = ref(false);
const loading = ref(false);
const uploadProgress = ref(0);
const selectedFile = ref(null);
const form = ref(null);

const formData = ref({
  title: '',
  description: '',
  engine: 'INRIA',
  quality_index: 1  // Default: Standard - AGGIUNTO
});

// Quality Levels Configuration - AGGIUNTO (identico al ReprocessModelDialog)


// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Current Quality Computed - AGGIUNTO
const currentQuality = computed(() => {
  return qualityLevelOpts.value[formData.value.quality_index] || qualityLevelOpts.value[1];
});

// Validation rules
const rules = {
  required: (value) => !!value || 'Field is required'
};

// Methods - LOGICA IDENTICA AL TUO ORIGINALE
async function handleFileChange(event) {
  selectedFile.value = event.target.files[0];
  if (selectedFile.value) {
    try {
      loading.value = true;
      await requestPresignedUrl(selectedFile.value);
      
      // Auto-populate title if empty
      if (!formData.value.title) {
        formData.value.title = selectedFile.value.name.replace(/\.[^/.]+$/, "");
      }
    } catch (error) {
      console.error('Error getting presigned URL:', error);
      alert('Error preparing upload. Please try again.');
    } finally {
      loading.value = false;
    }
  }
}

async function submit() {
  // Validation identica alla tua
  if (!selectedFile.value || !formData.value.title || !formData.value.engine) {
    alert("Select a file, insert a title, and choose a model type!");
    return;
  }

  loading.value = true;
  uploadProgress.value = 0;
  
  try {
    // Progress simulation
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += Math.random() * 10;
      }
    }, 200);

    // Upload to S3 - IDENTICO AL TUO
    await uploadFileToS3(selectedFile.value);
    uploadProgress.value = 100;
    clearInterval(progressInterval);

    // Save the model - MODIFICATO per includere quality
    await saveNewModel(
      formData.value.title,
      formData.value.description,
      formData.value.engine,
      currentQuality.value.value// ← AGGIUNTO parametro quality
    );

    emit('created');
    cancel();
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred during the upload.");
    uploadProgress.value = 0;
  } finally {
    loading.value = false;
  }
}

function cancel() {
  isOpen.value = false;
  formData.value = {
    title: '',
    description: '',
    engine: 'INRIA',
    quality_index: 1  // Reset to Standard - MODIFICATO
  };
  selectedFile.value = null;
  uploadProgress.value = 0;
  form.value?.resetValidation();
}

// Watch per reset quando si chiude
watch(isOpen, (newValue) => {
  if (!newValue) {
    // Reset form when closing
    setTimeout(() => {
      formData.value = {
        title: '',
        description: '',
        engine: 'INRIA',
        quality_index: 1  // MODIFICATO
      };
      selectedFile.value = null;
      uploadProgress.value = 0;
    }, 300);
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