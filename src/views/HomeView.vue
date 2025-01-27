<template>
  <div ref="container" class="three-scene"></div>
</template>

<script>
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import { ref, onMounted } from 'vue'
import * as THREE from 'three'

export default {
  name: 'ThreeScene',
  setup() {
    // Configura il renderer di Three.js
    const container = ref(null) // Div che contiene il canvas di Three.js
    let renderer

    const loadScene = () => {
      const viewer = new GaussianSplats3D.Viewer({
        renderer,
        cameraUp: [0, -1, -0.6],
        initialCameraPosition: [-1, -4, 6],
        initialCameraLookAt: [0, 4, 0],
        sphericalHarmonicsDegree: 2,
      })

      viewer
        .addSplatScene('/models/r2d2/point_cloud/iteration_30000/point_cloud.ply', {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: true,
          position: [0, 1, 0],
          rotation: [0, 0, 0, 1],
          scale: [1.5, 1.5, 1.5],
        })
        .then(() => {
          viewer.start()
        })
    }

    onMounted(async () => {
      // Configura il renderer di Three.js
      renderer = new THREE.WebGLRenderer()
      renderer.setSize(window.innerWidth, window.innerHeight)
      container.value.appendChild(renderer.domElement) // Appendi il canvas al div container

      loadScene()
    })

    return {
      container,
    }
  },
}
</script>

<style scoped></style>
