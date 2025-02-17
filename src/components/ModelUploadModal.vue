<template>
  <v-dialog :model-value="modelValue" max-width="500px">
    <v-card>
      <v-card-title class="text-h5">Carica un nuovo modello</v-card-title>
      <v-card-text>
        <v-text-field v-model="title" label="Titolo"></v-text-field>
        <input type="file" @change="handleFileChange" accept="video/*" />
      </v-card-text>
      <v-card-actions>
        <v-btn @click="close">Annulla</v-btn>
        <v-btn :loading="loading" @click="submit">Salva</v-btn>
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
const selectedFile = ref(null);
const loading = ref(false);

const handleFileChange = async (event) => {
  selectedFile.value = event.target.files[0];
  if (selectedFile.value) {
    await modelStore.requestPresignedUrl(selectedFile.value);
  }
};

const submit = async () => {
  if (!selectedFile.value || !title.value) {
    alert("Seleziona un file e inserisci un titolo!");
    return;
  }

  loading.value = true;
  try {
    // Upload su S3
    await modelStore.uploadFileToS3(selectedFile.value);
    // Salva il modello
    await modelStore.saveModel(title.value);
    isOpen.value = false;
  } catch (error) {
    console.error("Errore:", error);
    alert("Si è verificato un errore durante il caricamento.");
  } finally {
    loading.value = false;
    close()
  }
};

const close = () => { emit('update:modelValue', false); }
</script>
