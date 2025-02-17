<template>
  <div class="container">
    <!-- Vuetify Loading Overlay -->
    <v-overlay :model-value="loading" class="d-flex justify-center align-center">
      <v-progress-circular indeterminate size="64" color="primary"></v-progress-circular>
      <p class="ml-3">{{ loadingText }}</p>
    </v-overlay>
    <canvas ref="bjsCanvas" width="500" height="500" />
    <v-btn @click="goBack" class="home-button">Indietro</v-btn>
  </div>
</template>

<script setup>
import { ref, onMounted } from "@vue/runtime-core";
import { loadScene } from "../scenes/babylonScene.js";
import { useModelStore } from '@/stores/modelStore'; // Importa il nostro store Pinia
import { useRoute } from 'vue-router'
import * as JSZip from 'jszip'
import { Engine,Scene } from "@babylonjs/core";
import { useRouter } from 'vue-router'

const router = useRouter()
const bjsCanvas = ref(null);
const loading = ref(true);
const loadingText = ref("");

const goBack = () => {
  router.push({ name: 'home' }); // Assicurati che la route abbia il nome corretto
};

// 🔹 Definiamo il nostro Custom Loading Screen
class CustomLoadingScreen {
  displayLoadingUI() {
    console.log("Loading screen shown");
  }
  hideLoadingUI() {
    console.log("Loading screen hidden");
  }
  set loadingUIText(value) {
    this.$root.loadingText = value;
  }
}

onMounted(async () => {

  const engine = new Engine(bjsCanvas.value, true);
  const scene = new Scene(engine);

  // 🔹 Assegniamo il nostro loader personalizzato
  engine.loadingScreen = new CustomLoadingScreen();
  engine.displayLoadingUI(); // Mostra il loader di default

  const store = useModelStore()
  const route = useRoute()

  const zipBlob = await store.downloadZipModel(route.params.id)
  // Estrarre il file .ply
  const zip = await JSZip.loadAsync(zipBlob)
  let plyData = null
  let camerasData = null;

  for (const fileName in zip.files) {
    /*  if (fileName.startsWith('point_cloud/iteration_30000/') && fileName === 'point_cloud/iteration_30000/point_cloud.ply') {
        plyFileData = await zip.files[fileName].async('arraybuffer') // Ottieni i dati del file come ArrayBuffer

        // Converti il Blob in un URL temporaneo
        break
      }*/
    if (fileName.startsWith('point_cloud/iteration_30000/') && fileName === 'point_cloud/iteration_30000/point_cloud.ply') {
      const plyFileBlob = await zip.files['point_cloud/iteration_30000/point_cloud.ply'].async('blob');
      plyData = await plyFileBlob.arrayBuffer();

    }
    else if (fileName === 'cameras.json') {
      const camerasFileBlob = await zip.files[fileName].async('blob');
      const camerasText = await camerasFileBlob.text(); // Leggi il contenuto del file come testo
      camerasData = JSON.parse(camerasText); // Parso il JSON
    }
  }

  if (!plyData) {
    console.error('Nessun file .ply trovato nello zip!')
    return
  }

  if (bjsCanvas.value) {


    // Gestisci il ridimensionamento del canvas
    window.addEventListener('resize', () => {
      engine.resize();
    });

    loadScene(bjsCanvas.value, engine,scene, plyData, camerasData);

    scene.executeWhenReady(() => {
      loading.value = false; // Nasconde il loader
        engine.hideLoadingUI();
    });
  }
});

</script>

<style scoped>
@media (max-width: 768px) {
  canvas {
    width: 90%;
    height: 50%;
  }
}

canvas {
  width: 80%;
  /* Puoi modificare questa percentuale per regolare la larghezza */
  height: 60%;
  /* Puoi modificare questa percentuale per regolare l'altezza */
  display: block;
  margin: 0 auto;
  /* Per centrare orizzontalmente */
  position: absolute;
  /* Per posizionarlo sopra l'intera viewport */
  top: 50%;
  /* Posizionamento verticale */
  left: 50%;
  /* Posizionamento orizzontale */
  transform: translate(-50%, -50%);
  /* Centra esattamente il canvas rispetto alla finestra */
}
</style>