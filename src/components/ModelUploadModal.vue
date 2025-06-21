<template>
  <v-dialog :model-value="modelValue" max-width="500px">
    <v-card>
      <v-card-title class="text-h5">Load a new model</v-card-title>
      <v-card-text>
        <v-text-field v-model="title" label="Title"></v-text-field>
        <v-textarea v-model="description" label="Descrizione"></v-textarea>
        <!-- Grid List for engine options, responsive -->
        <v-responsive class="overflow-y-auto" max-height="280">
          <v-chip-group class="mt-3" column v-model="engineOption">
            <v-chip v-for="opt in engineOptions" :key="opt.value" :text="opt.label" :value="opt.value"></v-chip>
          </v-chip-group>
          </v-responsive>
          <input type="file" @change="handleFileChange" accept="video/*" lang="en" />
      </v-card-text>
      <v-card-actions>
        <v-btn @click="close">Cancel</v-btn>
        <v-btn :loading="loading" @click="submit">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from "vue";
import { useModelStore } from "@/stores/modelStore";

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const modelStore = useModelStore();
const isOpen = ref(false);
const title = ref("");
const description = ref("");
const selectedFile = ref(null);
const engineOption = ref(null); // This will hold the selected option from the dropdown
const loading = ref(false);

const engineOptions = [
  { label: "inria", value: "INRIA" },
  { label: "taming", value: "TAMING" },
  { label: "mcmc", value: "MCMC" },
  { label: "nerfstudio inria", value: "GSPLAT-INRIA" },
  { label: "nerfstudio mcmc", value: "GSPLAT-MCMC" },
];

const handleFileChange = async (event) => {
  selectedFile.value = event.target.files[0];
  if (selectedFile.value) {
    await modelStore.requestPresignedUrl(selectedFile.value);
  }
};

const submit = async () => {
  if (!selectedFile.value || !title.value || !engineOption.value) {
    alert("Select a file, insert a title, and choose a model type!");
    return;
  }

  loading.value = true;
  try {
    // Upload to S3
    await modelStore.uploadFileToS3(selectedFile.value);
    // Save the model
    await modelStore.saveModel(title.value,description.value, engineOption.value); // Pass the selected option to save the model
    isOpen.value = false;
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred during the upload.");
  } finally {
    loading.value = false;
    close();
  }
};

const close = () => { emit('update:modelValue', false); }
</script>
