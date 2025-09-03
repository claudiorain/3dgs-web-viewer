<template>
  <div ref="renderContainer" class="viewer-container" tabindex="0">
    <div id="stats-overlay" class="overlay-left"></div>
  </div>
</template>

<script setup>
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import * as JSZip from 'jszip'
import * as THREE from 'three'
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useModelStore } from '@/stores/modelStore'
import { storeToRefs } from 'pinia'
import { useMetrics } from '@/composables/useMetrics'

const { roundMetric } = useMetrics()

// Refs UI
const renderContainer = ref(null)

// Store
const modelStore = useModelStore()
const { selectedModel } = storeToRefs(modelStore)

// Viewer / risorse
let viewer = null
const plyUrl = ref(null)
const numberOfSplat = ref(null)

// ======= METRICHE BASE =======
const fps = ref(0)            // FPS visibili (display-bound)
let frameCount = 0
let lastFpsTick = performance.now()

const gpuMs = ref(null)       // ms/frame GPU
const gpuFpsTheo = ref(null)  // FPS teorici = 1000 / gpuMs
const cpuMs = ref(null)       // ms/frame CPU (JS)

// ======= METRICHE AVANZATE =======
const splatPerSecond = ref(null)     // Milioni di splat processati al secondo
const renderEfficiency = ref(null)   // Splat per millisecondo GPU
const memoryUsage = ref(null)        // Memoria GPU stimata in MB
const triangleEquivalent = ref(null) // Triangoli equivalenti per confronto
const performanceRating = ref('N/A') // Rating qualitativo performance

// ======= STATISTICHE STORICHE =======
const performanceHistory = {
  gpuTimes: [],
  splatCounts: [],
  maxSamples: 30
}

let running = true
let perfRaf = null

// Variabili GL / query
let gl = null
let ext = null
let queryPool = []
let inFlight = []
const MAX_QUERIES = 8

// ======= CALCOLO METRICHE AVANZATE =======
const calculateAdvancedMetrics = () => {
  if (!numberOfSplat.value || !gpuMs.value) return

  // Splat per secondo (in milioni)
  const splatCount = numberOfSplat.value
  const splatPerMs = splatCount / gpuMs.value
  splatPerSecond.value = (splatPerMs / 1000).toFixed(2) // Milioni/sec

  // Efficienza rendering (splat/ms GPU)
  renderEfficiency.value = (splatCount / gpuMs.value).toFixed(0)

  // Stima memoria GPU (approssimativa per Gaussian Splat)
  // Ogni splat ~ 60-80 bytes (posizione, colore, covarianza, opacità)
  const bytesPerSplat = 70 // stima media
  const memoryBytes = splatCount * bytesPerSplat
  memoryUsage.value = (memoryBytes / 1024 / 1024).toFixed(1) // MB

  // Equivalente in triangoli (per confronto con mesh tradizionali)
  // Stima: 1 splat ≈ 2-4 triangoli in termini di complessità visiva
  triangleEquivalent.value = (splatCount * 3 / 1000000).toFixed(2) // Milioni di triangoli

  // Rating performance qualitativo
  const fpsTheo = gpuFpsTheo.value || 0
  if (fpsTheo > 240) performanceRating.value = 'Eccellente'
  else if (fpsTheo > 120) performanceRating.value = 'Ottimo'
  else if (fpsTheo > 60) performanceRating.value = 'Buono'
  else if (fpsTheo > 30) performanceRating.value = 'Sufficiente'
  else performanceRating.value = 'Limitato'

  // Aggiorna storia performance
  performanceHistory.gpuTimes.push(gpuMs.value)
  performanceHistory.splatCounts.push(splatCount)
  
  if (performanceHistory.gpuTimes.length > performanceHistory.maxSamples) {
    performanceHistory.gpuTimes.shift()
    performanceHistory.splatCounts.shift()
  }
}

// ======= ANALISI SCALABILITÀ =======
const getScalabilityMetrics = () => {
  if (performanceHistory.gpuTimes.length < 5) return null
  
  const avgGpuTime = performanceHistory.gpuTimes.reduce((a, b) => a + b, 0) / performanceHistory.gpuTimes.length
  const avgSplatCount = performanceHistory.splatCounts.reduce((a, b) => a + b, 0) / performanceHistory.splatCounts.length
  
  // Tempo per milione di splat
  const timePerMSplat = avgGpuTime / (avgSplatCount / 1000000)
  
  return {
    avgGpuTime: avgGpuTime.toFixed(2),
    timePerMSplat: timePerMSplat.toFixed(3),
    stability: performanceHistory.gpuTimes.length > 10 ? 'Stabile' : 'In corso...'
  }
}

// ======= RESIZE / FULLSCREEN =======
const isFullscreen = () => !!document.fullscreenElement
const enterFullscreen = async () => {
  if (!isFullscreen()) {
    try { await renderContainer.value.requestFullscreen({ navigationUI: 'hide' }) } catch {}
  }
}
const exitFullscreen = async () => {
  if (isFullscreen()) {
    try { await document.exitFullscreen() } catch {}
  }
}
const toggleFullscreen = () => isFullscreen() ? exitFullscreen() : enterFullscreen()

const handleResize = () => {
  if (!viewer || !renderContainer.value) return
  const width  = renderContainer.value.clientWidth
  const height = renderContainer.value.clientHeight
  viewer.renderer.setSize(width, height, false)
  const camera = viewer.camera
  if (camera?.isPerspectiveCamera) {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
}

// ======= OVERLAY =======
const positionStatOverlay = () => {
  let overlayEl = document.getElementById('stats-overlay')
  if (!overlayEl) {
    overlayEl = document.createElement('div')
    overlayEl.id = 'stats-overlay'
    overlayEl.className = 'overlay-left'
    document.body.appendChild(overlayEl)
  }
  
  const title = selectedModel.value?.title ?? ''
  const engine = selectedModel.value?.training_config?.engine ?? ''
  const metrics = selectedModel.value?.phases?.metrics_evaluation?.metadata?.metrics ?? {}
  const scalability = getScalabilityMetrics()
  
  overlayEl.innerHTML = `
    <div class="section-header">🎮 MODELLO & QUALITÀ</div>
    <div class="stat">${engine}</div>
    <div class="stat">${title}</div>
    <div class="stat">PSNR: ${roundMetric(metrics.psnr, 'psnr')}</div>
    <div class="stat">LPIPS: ${roundMetric(metrics.lpips, 'lpips')}</div>
    <div class="stat">SSIM: ${roundMetric(metrics.ssim, 'ssim')}</div>
    
    <div class="section-header">⚡ PERFORMANCE REAL-TIME</div>
    <div class="stat fps-stat">FPS Display: ${fps.value}</div>
    <div class="stat gpu-stat">FPS Teorici: ${gpuFpsTheo.value != null ? gpuFpsTheo.value.toFixed(0) : 'n/d'}</div>
    <div class="stat">GPU Time: ${gpuMs.value != null ? gpuMs.value.toFixed(2) : 'n/d'} ms</div>
    <div class="stat">CPU Time: ${cpuMs.value != null ? cpuMs.value.toFixed(2) : 'n/d'} ms</div>
    <div class="stat rating-${performanceRating.value.toLowerCase()}">Rating: ${performanceRating.value}</div>
    
    <div class="section-header">📊 METRICHE AVANZATE</div>
    <div class="stat">Splat Count: ${numberOfSplat.value ? (numberOfSplat.value / 1000000).toFixed(2) + 'M' : '-'}</div>
    <div class="stat efficiency-stat">Splat/sec: ${splatPerSecond.value}M</div>
    <div class="stat">Efficienza: ${renderEfficiency.value} splat/ms</div>
    <div class="stat">Memoria GPU: ~${memoryUsage.value} MB</div>
    <div class="stat">≈ ${triangleEquivalent.value}M triangoli</div>
    
    ${scalability ? `
    <div class="section-header">📈 SCALABILITÀ</div>
    <div class="stat">Tempo/MSplat: ${scalability.timePerMSplat}ms</div>
    <div class="stat">Stabilità: ${scalability.stability}</div>
    ` : ''}
    
    <div class="section-footer">
      <div class="hotkey-hint">F: Fullscreen | I: Info native</div>
    </div>
  `
}

watch([fps, gpuMs, gpuFpsTheo, cpuMs, numberOfSplat, splatPerSecond, renderEfficiency, memoryUsage, triangleEquivalent, performanceRating], positionStatOverlay)

// ======= CAMERA UTILS =======
const getInitialCamera = (camerasData) => {
  if (!camerasData) {
    return {
      initialCameraPosition: [-1, -4, 6],
      initialCameraLookAt: [0, 0, 0],
      initialCameraUp: [0, 1, 0],
    }
  }
  const cameraData = camerasData[0]
  const initialCameraPosition = [...cameraData.position]
  const R = cameraData.rotation
  const dir = [R[0][2], R[1][2], R[2][2]]
  const len = Math.hypot(...dir) || 1
  const nd = dir.map(v => v / len)
  const lookAtDistance = 5
  const initialCameraLookAt = [
    initialCameraPosition[0] + nd[0] * lookAtDistance,
    initialCameraPosition[1] + nd[1] * lookAtDistance,
    initialCameraPosition[2] + nd[2] * lookAtDistance,
  ]
  const initialCameraUp = [-R[0][1], -R[1][1], -R[2][1]]
  return { initialCameraPosition, initialCameraLookAt, initialCameraUp }
}

// ======= CLEANUP =======
const cleanup = () => {
  running = false
  if (perfRaf) cancelAnimationFrame(perfRaf)
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('fullscreenchange', handleResize)
  window.removeEventListener('keydown', onKeyDown, true)

  try {
    if (viewer) {
      if (typeof viewer.stop === 'function') viewer.stop()
      if (typeof viewer.dispose === 'function') viewer.dispose()
      viewer = null
    }
    if (plyUrl.value) {
      URL.revokeObjectURL(plyUrl.value)
      plyUrl.value = null
    }
    if (ext && gl) {
      inFlight.forEach(q => gl.deleteQuery(q))
      queryPool.forEach(q => gl.deleteQuery(q))
    }
  } catch (e) {
    console.error('Error during cleanup:', e)
  }
}
onBeforeUnmount(cleanup)

// ======= KEY HANDLERS =======
const onKeyDown = (e) => {
  const k = e.key?.toLowerCase?.()
  if (k === 'f') {
    e.preventDefault()
    toggleFullscreen()
  }
}

// ======= MOUNT =======
onMounted(async () => {
  const store = useModelStore()
  const route = useRoute()

  try {
    // --- carica zip ---
    const zipArrayBuffer = await store.downloadZipModel(route.params.id)
    const zip = await JSZip.loadAsync(zipArrayBuffer)
    let camerasData = null
    let format = 0

    for (const fileName in zip.files) {
      if (fileName === 'point_cloud.ksplat') {
        format = 1
        const blob = await zip.files['point_cloud.ksplat'].async('blob')
        plyUrl.value = URL.createObjectURL(blob)
      } else if (fileName === 'point_cloud.splat') {
        const blob = await zip.files['point_cloud.splat'].async('blob')
        plyUrl.value = URL.createObjectURL(blob)
      } else if (fileName === 'cameras.json') {
        const blob = await zip.files[fileName].async('blob')
        camerasData = JSON.parse(await blob.text())
      }
    }
    if (!plyUrl.value) {
      console.error('Nessun file .splat/.ksplat trovato nello zip!')
      return
    }

    // --- renderer / canvas ---
    const width  = renderContainer.value.clientWidth
    const height = renderContainer.value.clientHeight

    const canvas = document.createElement('canvas')
    canvas.className = 'canvas-element'
    canvas.setAttribute('tabindex', '0')
    renderContainer.value.appendChild(canvas)

    const gl2 = canvas.getContext('webgl2', {
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      desynchronized: true,
    })

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl2 || undefined,
      alpha: false,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height, false)
    renderer.setClearColor(0x000000, 1)

    // porta a fuoco il canvas
    const focusCanvas = () => canvas.focus()
    focusCanvas()
    canvas.addEventListener('mousedown', focusCanvas)
    renderContainer.value.addEventListener('mousedown', focusCanvas)
    renderContainer.value.addEventListener('dblclick', () => toggleFullscreen())

    window.addEventListener('keydown', onKeyDown, true)

    // --- viewer ---
    const { initialCameraPosition, initialCameraLookAt, initialCameraUp } = getInitialCamera(camerasData)
    viewer = new GaussianSplats3D.Viewer({
      renderer,
      cameraUp: initialCameraUp,
      initialCameraPosition,
      initialCameraLookAt,
      ignoreDevicePixelRatio: false,
      logLevel: GaussianSplats3D.LogLevel.Debug,
    })

    await viewer.addSplatScene(plyUrl.value, {
      format,
      sphericalHarmonicsDegree: 2,
      gpuAcceleratedSort: true,
      splatAlphaRemovalThreshold: 5,
      position: [0, 1, 0],
      rotation: [0, 0, 0, 1],
      antialiased: true,
      logLevel: GaussianSplats3D.LogLevel.Info,
    })

    numberOfSplat.value = viewer.splatRenderCount

    // --- PERF: setup GPU timer query + wrap renderer.render ---
    gl = renderer.getContext()
    const isWebGL2 = gl && typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
    ext = isWebGL2 ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null

    if (ext) {
      queryPool = []
      inFlight = []
      for (let i = 0; i < MAX_QUERIES; i++) queryPool.push(gl.createQuery())
    }

    let cpuSamples = []
    let gpuSamples = []
    const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

    const _render = renderer.render.bind(renderer)
    renderer.render = function (...args) {
      const cpuStart = performance.now()

      // GPU begin
      let q = null
      if (ext && queryPool.length) {
        q = queryPool.pop()
        gl.beginQuery(ext.TIME_ELAPSED_EXT, q)
      }

      // draw
      _render(...args)

      // GPU end
      if (ext && q) {
        gl.endQuery(ext.TIME_ELAPSED_EXT)
        inFlight.push(q)
      }

      // CPU end
      const cpuDelta = performance.now() - cpuStart
      cpuSamples.push(cpuDelta)

      // FPS display-bound
      frameCount++
    }

    // --- avvia viewer ---
    viewer.start()

    // --- overlay / resize ---
    positionStatOverlay()
    window.addEventListener('resize', handleResize)
    document.addEventListener('fullscreenchange', handleResize)

    // --- loop per consumare query e loggare ---
    let lastLog = performance.now()
    const perfTick = () => {
      if (!running) return
      perfRaf = requestAnimationFrame(perfTick)

      // consume UNA query per frame
      if (ext && inFlight.length) {
        const front = inFlight[0]
        const available = gl.getQueryParameter(front, gl.QUERY_RESULT_AVAILABLE)
        const disjoint  = gl.getParameter(ext.GPU_DISJOINT_EXT)
        if (available && !disjoint) {
          const ns = gl.getQueryParameter(front, gl.QUERY_RESULT)
          const ms = ns / 1e6
          gpuSamples.push(ms)
          queryPool.push(inFlight.shift())
        } else if (available || disjoint) {
          gl.getQueryParameter(front, gl.QUERY_RESULT)
          queryPool.push(inFlight.shift())
        }
      }

      const now = performance.now()

      // aggiorna FPS una volta al secondo
      if (now - lastFpsTick >= 1000) {
        fps.value = Math.round((frameCount * 1000) / (now - lastFpsTick))
        frameCount = 0
        lastFpsTick = now
      }

      // log / metriche ogni ~1s
      if (now - lastLog > 1000) {
        const _cpu = avg(cpuSamples)
        const _gpu = avg(gpuSamples)
        cpuMs.value = Number.isFinite(_cpu) ? _cpu : null
        gpuMs.value = Number.isFinite(_gpu) ? _gpu : null
        gpuFpsTheo.value = gpuMs.value ? 1000 / gpuMs.value : null

        // Calcola metriche avanzate
        calculateAdvancedMetrics()

        // Log completo del cruscotto
        const title = selectedModel.value?.title ?? 'N/A'
        const engine = selectedModel.value?.training_config?.engine ?? 'N/A'
        const metrics = selectedModel.value?.phases?.metrics_evaluation?.metadata?.metrics ?? {}
        const scalability = getScalabilityMetrics()

        console.log(`
╭─────────────────── GAUSSIAN SPLATS DASHBOARD ───────────────────╮
│ 🎮 MODELLO & QUALITÀ                                             │
│   Scena: ${title.padEnd(45, ' ')}                │
│   Engine: ${engine.padEnd(44, ' ')}                │
│   PSNR: ${roundMetric(metrics.psnr, 'psnr').toString().padEnd(8, ' ')} LPIPS: ${roundMetric(metrics.lpips, 'lpips').toString().padEnd(8, ' ')} SSIM: ${roundMetric(metrics.ssim, 'ssim').toString().padEnd(8, ' ')}        │
│                                                                   │
│ ⚡ PERFORMANCE REAL-TIME                                          │
│   FPS Display: ${fps.value.toString().padEnd(12, ' ')} FPS Teorici: ${(gpuFpsTheo.value?.toFixed(0) ?? 'n/d').padEnd(12, ' ')}      │
│   GPU Time: ${(gpuMs.value?.toFixed(2) ?? 'n/d').toString().padEnd(8, ' ')} ms   CPU Time: ${(cpuMs.value?.toFixed(2) ?? 'n/d').toString().padEnd(8, ' ')} ms        │
│   Rating: ${performanceRating.value.padEnd(44, ' ')}                │
│                                                                   │
│ 📊 METRICHE AVANZATE                                              │
│   Splat Count: ${(numberOfSplat.value ? (numberOfSplat.value / 1000000).toFixed(2) + 'M' : 'n/d').padEnd(13, ' ')} Memoria: ~${(memoryUsage.value ?? 'n/d')} MB        │
│   Splat/sec: ${(splatPerSecond.value ?? 'n/d').toString().padEnd(6, ' ')}M      Efficienza: ${(renderEfficiency.value ?? 'n/d')} splat/ms      │
│   ≈ ${(triangleEquivalent.value ?? 'n/d')}M triangoli equivalenti                           │
${scalability ? `│                                                                   │
│ 📈 SCALABILITÀ                                                     │
│   Tempo/MSplat: ${scalability.timePerMSplat}ms     Stabilità: ${scalability.stability.padEnd(12, ' ')}       │` : ''}
╰───────────────────────────────────────────────────────────────────╯
        `)

        cpuSamples = []
        gpuSamples = []
        lastLog = now
        positionStatOverlay()
      }
    }
    perfTick()

  } catch (e) {
    console.error('Errore durante l\'inizializzazione:', e)
  }
})
</script>

<style>
/* riempi sempre la viewport */
.viewer-container {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  outline: none;
}

.canvas-element {
  width: 100%;
  height: 100%;
  display: block;
}

/* Overlay con dati migliorato */
.overlay-left {
  position: fixed;
  top: 10px;
  left: 10px;
  background: rgba(15, 15, 25, 0.92);
  color: white;
  padding: 16px;
  border-radius: 8px;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  z-index: 9999;
  font-size: 13px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
  border: 1px solid rgba(255,255,255,0.1);
  pointer-events: none;
  max-width: 320px;
  backdrop-filter: blur(10px);
}

.section-header {
  margin: 15px 0 8px 0;
  font-size: 12px;
  font-weight: bold;
  color: #00d4ff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.3);
  padding-bottom: 4px;
}

.section-header:first-child {
  margin-top: 0;
}

.stat {
  margin: 6px 0;
  font-size: 13px;
  font-weight: 400;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  line-height: 1.3;
}

.fps-stat {
  color: #00ff88 !important;
  font-weight: bold !important;
  font-size: 14px !important;
}

.gpu-stat {
  color: #ff6b35 !important;
  font-weight: bold !important;
}

.efficiency-stat {
  color: #ffd700 !important;
  font-weight: bold !important;
}

.rating-eccellente { color: #00ff00 !important; }
.rating-ottimo { color: #88ff00 !important; }
.rating-buono { color: #ffff00 !important; }
.rating-sufficiente { color: #ff8800 !important; }
.rating-limitato { color: #ff4444 !important; }

.section-footer {
  margin-top: 15px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.hotkey-hint {
  font-size: 11px;
  color: #999;
  font-style: italic;
}
</style>