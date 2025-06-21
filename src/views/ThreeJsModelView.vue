<template>
    <v-container fluid class="container pa-0 ma-0" ref="containerRef">

    <canvas ref="bjsCanvas" class="canvas-element" />

    <!-- Overlay con dati fissi nell'angolo in alto a sinistra -->
    

    <!-- Pulsante "Indietro" nell'angolo in alto a destra -->
  </v-container>
</template>

<script setup>
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as JSZip from 'jszip';
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import { useModelStore } from '@/stores/modelStore';
import { storeToRefs } from 'pinia';

const router = useRouter();
const bjsCanvas = ref(null);
const containerRef = ref(null);
let viewer;
let canvasObserver = null;
let resizeObserver = null;
const plyUrl = ref(null); // Store URL reference for cleanup
const modelStore = useModelStore();

const { selectedModel } = storeToRefs(modelStore);

const numberOfSplat = ref(null);

// Variabili per FPS
const fps = ref(0);
const frameCount = ref(0);
const lastTime = ref(performance.now());

const goBack = () => {
  cleanup();
  router.push({ name: 'home' });
};

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
const handleResize = () => {
  if (viewer && viewer.camera && viewer.renderer) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    console.log(`Resize: ${width}x${height}`);

    // Aggiorna le dimensioni del canvas
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    // Aggiorna il renderer e la camera
    if (viewer.renderer.setSize) {
      viewer.renderer.setSize(width, height);
    }

    if (viewer.camera.aspect !== undefined) {
      viewer.camera.aspect = width / height;
      viewer.camera.updateProjectionMatrix();
    }

    // Forza un render per aggiornare la visualizzazione
    if (viewer.render && typeof viewer.render === 'function') {
      viewer.render();
    } else if (viewer.update && typeof viewer.update === 'function') {
      viewer.update();
    }
  }
};

// Funzione per posizionare manualmente il canvas se la libreria lo sposta
const adjustCanvasPosition = () => {
  // Verifica se il canvas è stato spostato fuori dal container
  const canvasElements = document.querySelectorAll('canvas');

  canvasElements.forEach(canvas => {
    // Se è un canvas spostato al di fuori del nostro container
    if (canvas && (!canvas.parentElement || !canvas.parentElement.classList.contains('container'))) {
      console.log("Canvas trovato, aggiustamento posizione e dimensioni...");

      // Applica stili per il canvas a schermo intero
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.zIndex = '0';

      // Imposta anche la larghezza e altezza effettive del canvas (non solo CSS)
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      canvas.style.touchAction = 'none';
      // Gestisci il ridimensionamento
      handleResize();
    }
  });

  
};

// Osserva le modifiche DOM per rilevare quando il canvas viene spostato
const setupObservers = () => {
  // MutationObserver per rilevare cambimenti nella struttura DOM
  if (typeof MutationObserver !== 'undefined') {
    canvasObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          adjustCanvasPosition();
        }
      }
    });

    canvasObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ResizeObserver per gestire il ridimensionamento della finestra
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(document.body);
  } else {
    // Fallback per browser che non supportano ResizeObserver
    window.addEventListener('resize', handleResize);
  }
};

onBeforeUnmount(() => {
  if (canvasObserver) {
    canvasObserver.disconnect();
    canvasObserver = null;
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  } else {
    window.removeEventListener('resize', handleResize);
  }

  cleanup();
});

onMounted(async () => {
  const store = useModelStore();
  const route = useRoute();

  // Imposta il layout della pagina corrente
  if (containerRef.value) {
    containerRef.value.$el.style.height = '100vh';
    containerRef.value.$el.style.width = '100vw';
    containerRef.value.$el.style.maxHeight = '100vh';
    containerRef.value.$el.style.maxWidth = '100vw';
    containerRef.value.$el.style.overflow = 'hidden';
    containerRef.value.$el.style.position = 'fixed';
    containerRef.value.$el.style.top = '0';
    containerRef.value.$el.style.left = '0';
  }

  try {
    const zipArrayBuffer = await store.downloadZipModel(route.params.id);
    const zip = await JSZip.loadAsync(zipArrayBuffer);
    let camerasData = null;

    for (const fileName in zip.files) {
      if (fileName === 'point_cloud.splat') {
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

    if (bjsCanvas.value) {
      // Imposta le dimensioni iniziali del canvas
      bjsCanvas.value.width = window.innerWidth;
      bjsCanvas.value.height = window.innerHeight;

      const cameraParams = getInitialCamera(camerasData);
      const initialCameraPosition = cameraParams.initialCameraPosition;
      const initialCameraLookAt = cameraParams.initialCameraLookAt;
      const initialCameraUp = cameraParams.initialCameraUp;

      // Inizializza il viewer con impostazioni specifiche
      viewer = new GaussianSplats3D.Viewer({
        'canvas': bjsCanvas.value,
        'cameraUp': initialCameraUp,
        'initialCameraPosition': initialCameraPosition,
        'initialCameraLookAt': initialCameraLookAt,
        // Altre opzioni che potrebbero aiutare con il rendering
        'ignoreDevicePixelRatio': false, // Assicura che il rendering rispetti il rapporto pixel del dispositivo
        'logLevel': GaussianSplats3D.LogLevel.Debug // Per debugging
      });

      // Configura gli osservatori dopo l'inizializzazione del viewer
      setupObservers();

      // Aggiungi la scena dei splat
      await viewer.addSplatScene(plyUrl.value, {
        'format': 0,
        'sphericalHarmonicsDegree': 2,
        'gpuAcceleratedSort': true,
        'splatAlphaRemovalThreshold': 5,
        'position': [0, 1, 0],
        'rotation': [0, 0, 0, 1]
      });

      numberOfSplat.value = viewer.splatRenderCount;
      // Avvia il viewer
      viewer.start();
      
      positionStatOverlay();

      // Avvia il contatore FPS
      updateFPS();

      // Aggiusta la posizione e forza un ridimensionamento dopo che tutto è caricato
      nextTick(() => {
        adjustCanvasPosition();
        setTimeout(handleResize, 100); // Piccolo ritardo per assicurarsi che tutto sia inizializzato
      });
    }
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
      <div class="stat">ThreeJS</div>
      <div class="stat">${selectedModel.value.title}</div>
      <div class="stat fps-stat">FPS: ${fps.value}</div>
      <div class="stat">Nr. of splat: ${numberOfSplat.value}</div>
      <div class="stat">PSNR: ${selectedModel.value.results.psnr}</div>
      <div class="stat">LPIPS: ${selectedModel.value.results.lpips}</div>
      <div class="stat">SSIM: ${selectedModel.value.results.ssim}</div>
    `;
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
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
  touch-action: none !important;
}

.canvas-element {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  z-index: 1;
  margin: 0;
  padding: 0;
  touch-action: none;
  outline: none;
}

/* Overlay con dati nell'angolo in alto a sinistra */
.overlay-left {
  position: fixed;
  top: 10px;
  left: 10px;
  background: rgba(123, 118, 117, 0.5); /* Sfondo più scuro per maggiore contrasto */
  color: white;
  padding: 12px;
  border-radius: 6px; /* Bordi arrotondati */
  font-family: Arial, sans-serif;
  z-index: 9999; /* Z-index molto più alto */
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5); /* Ombra per maggiore visibilità */
  transform: translateZ(0); /* Forza un nuovo stacking context */
  will-change: transform; /* Migliora le performance e aiuta con il rendering */
  pointer-events: none; /* Permette di cliccare attraverso l'overlay */
}

.stat {
  margin: 7px 0;
  font-size: 14px;
  font-weight: 500; /* Un po' più spesso per leggibilità */
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7); /* Ombra testo per leggibilità */
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