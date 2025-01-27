<template>
  <div ref="container" class="three-scene"></div>
</template>

<script>
import * as THREE from 'three'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'
import { ref, onMounted } from 'vue'

export default {
  name: 'ThreeScene',
  setup() {
    const container = ref(null) // Div che contiene il canvas di Three.js
    const scene = new THREE.Scene()
    let camera, renderer, plyObject

    // Funzione per caricare il file .ply
    const loadPLY = () => {
      const loader = new PLYLoader()
      loader.load('/models/r2d2/point_cloud/iteration_30000/point_cloud.ply', (geometry) => {
        const material = new THREE.PointsMaterial({ vertexColors: THREE.VertexColors, size: 0.05 })
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7) // Luce ambientale
        plyObject = new THREE.Points(geometry, material)
        scene.add(plyObject)
        scene.add(ambientLight)
      })
    }

    // Funzione per caricare la configurazione della fotocamera
    const loadCameraConfig = async () => {
      try {
        const response = await fetch('/models/r2d2/cameras.json')

        // Controlla che la risposta sia valida
        if (!response.ok) {
          throw new Error(`Errore nel caricamento del JSON: ${response.statusText}`)
        }

        // Ottieni il contenuto come testo
        const text = await response.text()

        // Verifica se il contenuto è effettivamente un JSON
        if (text.startsWith('<!DOCTYPE html>')) {
          throw new Error('Il file che stai tentando di caricare non è JSON, ma una pagina HTML.')
        }

        // Converte il testo in JSON
        const cameraConfigs = JSON.parse(text)

        // Per ogni fotocamera nel file JSON, crea la fotocamera in Three.js
        const firstCameraConfig = cameraConfigs[0] // Selezioniamo la prima fotocamera, ma puoi anche fare qualcosa di diverso

        const { width, height, fx, fy, position, rotation } = firstCameraConfig
        const aspectRatio = width / height
        const fov = 2 * Math.atan(height / (2 * fy)) * (180 / Math.PI) // Calcola il FOV in gradi

        // Crea la fotocamera in Three.js
        camera = new THREE.PerspectiveCamera(fov, aspectRatio, 0.1, 1000)

        // Imposta la posizione della fotocamera
        camera.position.set(...position)

        // Crea una matrice di rotazione dalla matrice 3x3 nel JSON
        const rotationMatrix = new THREE.Matrix4().set(
          rotation[0][0],
          rotation[0][1],
          rotation[0][2],
          0,
          rotation[1][0],
          rotation[1][1],
          rotation[1][2],
          0,
          rotation[2][0],
          rotation[2][1],
          rotation[2][2],
          0,
          0,
          0,
          0,
          1,
        )
        camera.rotation.setFromRotationMatrix(rotationMatrix)
      } catch (error) {
        console.error('Errore nel caricamento del JSON:', error)
      }
    }

    // Funzione di animazione
    const animate = () => {
      requestAnimationFrame(animate)

      // Ruota il modello .ply se è stato caricato
      if (plyObject) {
        plyObject.rotation.x += 0.01
        plyObject.rotation.y += 0.01
      }

      // Renderizza la scena con la fotocamera
      renderer.render(scene, camera)
    }

    // Setup dopo il montaggio del componente
    onMounted(async () => {
      loadPLY() // Carica il modello .ply
      await loadCameraConfig() // Carica la configurazione della fotocamera

      // Configura il renderer di Three.js
      renderer = new THREE.WebGLRenderer()
      renderer.setSize(window.innerWidth, window.innerHeight)
      container.value.appendChild(renderer.domElement) // Appendi il canvas al div container

      // Avvia l'animazione
      animate()
    })

    return {
      container,
    }
  },
}
</script>

<style scoped></style>
