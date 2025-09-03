<template>
  <div ref="renderContainer" class="viewer-container"></div>
</template>

<script setup>
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as JSZip from 'jszip';
import * as THREE from 'three';
import { ref, onMounted, onBeforeUnmount,watch } from 'vue';
import { useRoute,useRouter } from 'vue-router';
import { useModelStore } from '@/stores/modelStore';
import { storeToRefs } from 'pinia';
import { useMetrics } from '@/composables/useMetrics'
const { roundMetric, getMetricColor } = useMetrics()

const router = useRouter();
const bjsCanvas = ref(null);
const renderContainer = ref(null)
const containerRef = ref(null);
let viewer;
const plyUrl = ref(null); // Store URL reference for cleanup
const modelStore = useModelStore();

const { selectedModel } = storeToRefs(modelStore);

const numberOfSplat = ref(null);

// Variabili per FPS
const fps = ref(0);
const frameCount = ref(0);
const lastTime = ref(performance.now());

// Funzione per calcolare gli FPS
const updateFPS = () => {
  const currentTime = performance.now();
  frameCount.value++;

  if (currentTime - lastTime.value >= 1000) {
    fps.value = Math.round((frameCount.value * 1000) / (currentTime - lastTime.value));
    frameCount.value = 0;
    lastTime.value = currentTime;
  }

  requestAnimationFrame(updateFPS);
};

// Funzione per gestire il ridimensionamento della finestra e aggiornare il renderer



// Osserva le modifiche DOM per rilevare quando il canvas viene spostato


onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  cleanup();
});

onMounted(async () => {
  const store = useModelStore();
  const route = useRoute();



  try {
    const zipArrayBuffer = await store.downloadZipModel(route.params.id);
    const zip = await JSZip.loadAsync(zipArrayBuffer);
    let camerasData = null;

    let format = 0
    for (const fileName in zip.files) {
      if (fileName === 'point_cloud.ksplat') {
        format = 1
        const plyFileBlob = await zip.files['point_cloud.ksplat'].async('blob');
        plyUrl.value = URL.createObjectURL(plyFileBlob);
      }
      else if(fileName === 'point_cloud.splat') {
        const plyFileBlob = await zip.files['point_cloud.splat'].async('blob');
        plyUrl.value = URL.createObjectURL(plyFileBlob);
      }
      else if (fileName === 'cameras.json') {
        const camerasFileBlob = await zip.files[fileName].async('blob');
        const camerasText = await camerasFileBlob.text();
        camerasData = JSON.parse(camerasText);
      }
    }

    if (!plyUrl.value) {
      console.error('Nessun file .splat trovato nello zip!');
      return;
    }

    const width = renderContainer.value.clientWidth
    const height = renderContainer.value.clientHeight
    // Renderer e canvas
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderContainer.value.appendChild(renderer.domElement)
    handleResize();

    const cameraParams = getInitialCamera(camerasData);
    const initialCameraPosition = cameraParams.initialCameraPosition;
    const initialCameraLookAt = cameraParams.initialCameraLookAt;
    const initialCameraUp = cameraParams.initialCameraUp;

    // Inizializza il viewer con impostazioni specifiche
    viewer = new GaussianSplats3D.Viewer({
      renderer,
      'cameraUp': initialCameraUp,
      'initialCameraPosition': initialCameraPosition,
      'initialCameraLookAt': initialCameraLookAt,
      // Altre opzioni che potrebbero aiutare con il rendering
      'ignoreDevicePixelRatio': false, // Assicura che il rendering rispetti il rapporto pixel del dispositivo
      'logLevel': GaussianSplats3D.LogLevel.Debug // Per debugging
    });


    // Aggiungi la scena dei splat
    await viewer.addSplatScene(plyUrl.value, {
      'format': format,
      'sphericalHarmonicsDegree': 2,
      'gpuAcceleratedSort': true,
      'splatAlphaRemovalThreshold': 5,
      'position': [0, 1, 0],
      'rotation': [0, 0, 0, 1],
      'antialiased': true,
      'logLevel': GaussianSplats3D.LogLevel.Info
    });

    numberOfSplat.value = viewer.splatRenderCount;
    // Avvia il viewer
    viewer.start();

    positionStatOverlay();

    window.addEventListener('resize', handleResize);

    // Avvia il contatore FPS
    updateFPS();


  } catch (e) {
    console.error("Errore durante l'inizializzazione:", e);
  }
});

const getInitialCameraBck = (camerasData) => {
  if (camerasData) {
    const cameraData = camerasData[0];

    // Calcolo di initialCameraPosition
    const initialCameraPosition = [
      cameraData.position[0],
      cameraData.position[2],
      -cameraData.position[1]
    ];

    // Estrazione della matrice di rotazione
    const rotationMatrix = [
      [cameraData.rotation[0][0], cameraData.rotation[0][1], cameraData.rotation[0][2]],
      [cameraData.rotation[1][0], cameraData.rotation[1][1], cameraData.rotation[1][2]],
      [cameraData.rotation[2][0], cameraData.rotation[2][1], cameraData.rotation[2][2]]
    ];

    // Calcolo direzione
    const direction = [
      -rotationMatrix[0][2],
      -rotationMatrix[1][2],
      -rotationMatrix[2][2]
    ];

    // Calcolo lookAt
    const initialCameraLookAt = [
      initialCameraPosition[0] + direction[0],
      initialCameraPosition[1] + direction[1],
      initialCameraPosition[2] + direction[2]
    ];

    // Imposta cameraUp
    const initialCameraUp = [0, -1, -0.6];

    // Restituisci un oggetto con i tre valori
    return {
      initialCameraPosition,
      initialCameraLookAt,
      initialCameraUp  // Nota: nome cambiato da initialCameraUp a cameraUp
    };
  }

  // Se non ci sono dati della camera, restituisci valori predefiniti
  return {
    initialCameraPosition: [-1, -4, 6],
    initialCameraLookAt: [0, 0, 0],
    initialCameraUp: [0, -1, -0.6]
  };
};
const getInitialCamera = (camerasData) => {
  if (!camerasData) {
    // Valori predefiniti se non ci sono dati della camera
    return {
      initialCameraPosition: [-1, -4, 6],
      initialCameraLookAt: [0, 0, 0],
      initialCameraUp: [0, 1, 0]
    };
  }
  const cameraData = camerasData[0];
  // Estrai posizione dalla camera (considerando la conversione di coordinate)
  const initialCameraPosition = [
    cameraData.position[0],           // X rimane invariato 
    cameraData.position[1],           // Y rimane invariato
    cameraData.position[2]            // Z rimane invariato
  ];

  // Estrai la matrice di rotazione
  const rotationMatrix = cameraData.rotation;

  // Calcola la direzione della camera dalla matrice di rotazione
  // In genere, la terza colonna della matrice di rotazione rappresenta 
  // la direzione in cui la camera sta guardando
  const direction = [
    rotationMatrix[0][2],
    rotationMatrix[1][2],
    rotationMatrix[2][2]
  ];

  // Normalizza la direzione per avere una lunghezza costante
  const length = Math.sqrt(
    direction[0] * direction[0] +
    direction[1] * direction[1] +
    direction[2] * direction[2]
  );

  const normalizedDirection = [
    direction[0] / length,
    direction[1] / length,
    direction[2] / length
  ];

  // Calcola il punto di lookAt sommando la direzione normalizzata alla posizione
  // Moltiplichiamo la direzione per una distanza (es. 5 unità) per ottenere un punto di lookAt più distante
  const lookAtDistance = 5;
  const initialCameraLookAt = [
    initialCameraPosition[0] + normalizedDirection[0] * lookAtDistance,
    initialCameraPosition[1] + normalizedDirection[1] * lookAtDistance,
    initialCameraPosition[2] + normalizedDirection[2] * lookAtDistance
  ];

  // Estrai il vettore "up" dalla matrice di rotazione
  // Tipicamente, la seconda colonna della matrice di rotazione rappresenta l'asse "up"
  const initialCameraUp = [
    -rotationMatrix[0][1],
    -rotationMatrix[1][1],
    -rotationMatrix[2][1]
  ];

  return {
    initialCameraPosition,
    initialCameraLookAt,
    initialCameraUp
  };
}

const cleanup = () => {
  console.log("Cleaning up resources...");

  try {
    if (viewer) {
      if (typeof viewer.stop === 'function') {
        viewer.stop();
      }

      if (typeof viewer.dispose === 'function') {
        viewer.dispose();
      }

      viewer = null;
    }

    if (plyUrl.value) {
      URL.revokeObjectURL(plyUrl.value);
      plyUrl.value = null;
    }
  } catch (e) {
    console.error("Error during cleanup:", e);
  }
};

const handleResize = () => {
  if (!viewer || !renderContainer.value) return;

  const width = renderContainer.value.clientWidth;
  const height = renderContainer.value.clientHeight;

  // Aggiorna la dimensione del renderer
  viewer.renderer.setSize(width, height);

  // Aggiorna la camera
  const camera = viewer.camera;
  if (camera && camera.isPerspectiveCamera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
};

const positionStatOverlay = () => {
  if (numberOfSplat.value) {
    // Trova o crea l'elemento overlay
    let overlayEl = document.getElementById('stats-overlay');

    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.id = 'stats-overlay';
      overlayEl.className = 'overlay-left';
      document.body.appendChild(overlayEl);
    }

    // Aggiorna il contenuto con FPS inclusi
    overlayEl.innerHTML = `
      <div class="stat">${selectedModel.value.training_config.engine}</div>
      <div class="stat">${selectedModel.value.title}</div>
      <div class="stat fps-stat">FPS: ${fps.value}</div>
      <div class="stat">Nr. of splat: ${numberOfSplat.value}</div>
      <div class="stat">PSNR: ${roundMetric(selectedModel.value.phases?.metrics_evaluation?.metadata?.metrics.psnr, 'psnr')}</div>
      <div class="stat">LPIPS: ${roundMetric(selectedModel.value.phases?.metrics_evaluation?.metadata?.metrics.lpips, "lpips")}</div>
      <div class="stat">SSIM: ${roundMetric(selectedModel.value.phases?.metrics_evaluation?.metadata?.metrics.ssim, "ssim")}</div>
    `
  }
};

// Watcher per aggiornare l'overlay quando cambiano gli FPS
watch(fps, () => {
  positionStatOverlay();
});
</script>

<style>
/* Stili globali per gestire il canvas ovunque venga spostato */
.container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.viewer-container {
  width: 100%;
  height: 100vh;
  /* Altezza = altezza viewport */
  position: relative;
  overflow: hidden;
}

.canvas-element {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  display: block;
}

/* Overlay con dati nell'angolo in alto a sinistra */
.overlay-left {
  position: fixed;
  top: 10px;
  left: 10px;
  background: rgba(123, 118, 117, 0.5);
  /* Sfondo più scuro per maggiore contrasto */
  color: white;
  padding: 12px;
  border-radius: 6px;
  /* Bordi arrotondati */
  font-family: Arial, sans-serif;
  z-index: 9999;
  /* Z-index molto più alto */
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  /* Ombra per maggiore visibilità */
  transform: translateZ(0);
  /* Forza un nuovo stacking context */
  will-change: transform;
  /* Migliora le performance e aiuta con il rendering */
  pointer-events: none;
  /* Permette di cliccare attraverso l'overlay */
}

.stat {
  margin: 7px 0;
  font-size: 14px;
  font-weight: 500;
  /* Un po' più spesso per leggibilità */
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  /* Ombra testo per leggibilità */
}

/* Stile specifico per FPS - evidenziato in verde */
.fps-stat {
  color: #00ff00 !important;
  font-weight: bold !important;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8) !important;
}

/* Posizionamento del bottone "Indietro" nell'angolo in alto a destra */
.overlay-right {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 999;
}
</style>