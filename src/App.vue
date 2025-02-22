// App.vue
<template>
  <div class="game-container">
    <canvas ref="canvas"></canvas>
    <q-card class="debug-overlay q-ma-md">
      <q-card-section>
        <div>X Tilt: {{ tilt.x.toFixed(2) }}</div>
        <div>Y Tilt: {{ tilt.y.toFixed(2) }}</div>
        <div>Ball X: {{ ballPosition.x.toFixed(2) }}</div>
        <div>Ball Y: {{ ballPosition.y.toFixed(2) }}</div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Motion } from '@capacitor/motion'
import * as THREE from 'three'

// Refs for template
const canvas = ref(null)
const tilt = ref({ x: 0, y: 0 })
const ballPosition = ref({ x: 0, y: 0 })

// Three.js components
let scene, camera, renderer, ball, plane
let ballVelocity = new THREE.Vector3()

// Game settings
const friction = 0.95
const sensitivity = 0.001
const cameraHeight = 20
const fov = 75
let gameBounds = { width: 0, height: 0 }

const initThreeJS = () => {
  // Scene setup
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true
  })
  renderer.setSize(window.innerWidth, window.innerHeight)

  // Calculate plane dimensions based on camera FOV
  const aspect = window.innerWidth / window.innerHeight
  gameBounds.width = 2 * cameraHeight * Math.tan((fov / 2) * Math.PI / 180) * aspect
  gameBounds.height = 2 * cameraHeight * Math.tan((fov / 2) * Math.PI / 180)

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  // Ball creation with realistic material
  const geometry = new THREE.SphereGeometry(1, 32, 32)
  const material = new THREE.MeshStandardMaterial({
    color: 0xe60000,
    metalness: 0.3,
    roughness: 0.4,
  })
  ball = new THREE.Mesh(geometry, material)
  ball.position.y = 1  // Set initial height and keep it constant
  scene.add(ball)

  // Ground plane and walls
  const createWalls = () => {
    const wallHeight = 2
    const wallThickness = 0.5
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.3,
      roughness: 0.7
    })

    // Create walls
    const walls = [
      // North wall
      new THREE.BoxGeometry(gameBounds.width + wallThickness * 2, wallHeight, wallThickness),
      // South wall
      new THREE.BoxGeometry(gameBounds.width + wallThickness * 2, wallHeight, wallThickness),
      // East wall
      new THREE.BoxGeometry(wallThickness, wallHeight, gameBounds.height + wallThickness * 2),
      // West wall
      new THREE.BoxGeometry(wallThickness, wallHeight, gameBounds.height + wallThickness * 2)
    ]

    const wallPositions = [
      [0, wallHeight / 2, -gameBounds.height / 2], // North
      [0, wallHeight / 2, gameBounds.height / 2],  // South
      [gameBounds.width / 2, wallHeight / 2, 0],   // East
      [-gameBounds.width / 2, wallHeight / 2, 0]   // West
    ]

    walls.forEach((geometry, index) => {
      const wall = new THREE.Mesh(geometry, wallMaterial)
      wall.position.set(...wallPositions[index])
      scene.add(wall)
    })
  }

  // Ground plane
  const planeGeometry = new THREE.PlaneGeometry(gameBounds.width, gameBounds.height)
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    metalness: 0.1,
    roughness: 0.8
  })
  plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.rotation.x = -Math.PI / 2
  scene.add(plane)

  // Add the walls
  createWalls()

  // Position camera for bird's eye view
  camera.position.set(0, cameraHeight, 0)
  camera.lookAt(0, 0, 0)
}

const updatePhysics = () => {
  // Apply tilt forces
  ballVelocity.x += tilt.value.x * sensitivity
  ballVelocity.z += tilt.value.y * sensitivity

  // Apply friction
  ballVelocity.multiplyScalar(friction)

  // Calculate next position
  const nextX = ball.position.x + ballVelocity.x
  const nextZ = ball.position.z + ballVelocity.z

  // Boundary constraints without bounce
  const bounds = gameBounds.width / 2

  // X-axis constraint
  if (Math.abs(nextX) >= bounds) {
    ball.position.x = Math.sign(nextX) * bounds
    ballVelocity.x = 0
  } else {
    ball.position.x = nextX
  }

  // Z-axis constraint
  if (Math.abs(nextZ) >= bounds) {
    ball.position.z = Math.sign(nextZ) * bounds
    ballVelocity.z = 0
  } else {
    ball.position.z = nextZ
  }

  // Update ball rotation based on movement
  ball.rotation.x += ballVelocity.z * 0.5
  ball.rotation.z -= ballVelocity.x * 0.5

  // Update position ref for UI
  ballPosition.value = {
    x: ball.position.x,
    y: ball.position.z
  }
}

const animate = () => {
  requestAnimationFrame(animate)
  updatePhysics()
  renderer.render(scene, camera)
}

const handleResize = () => {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)

  // Update plane size and walls on resize
  const aspect = width / height
  gameBounds.width = 2 * cameraHeight * Math.tan((fov / 2) * Math.PI / 180) * aspect
  gameBounds.height = 2 * cameraHeight * Math.tan((fov / 2) * Math.PI / 180)

  // Remove old plane and walls
  scene.remove(plane)
  scene.children = scene.children.filter(child =>
    child instanceof THREE.Light || child === ball
  )

  // Create new plane and walls
  const planeGeometry = new THREE.PlaneGeometry(gameBounds.width, gameBounds.height)
  plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.rotation.x = -Math.PI / 2
  scene.add(plane)
  createWalls()
}

const startOrientation = async () => {
  try {
    await Motion.addListener('orientation', event => {
      tilt.value = {
        x: event.gamma || 0,
        y: event.beta || 0
      }
    })
  } catch (error) {
    console.error('Error accessing device orientation:', error)
  }
}

onMounted(async () => {
  initThreeJS()
  await startOrientation()
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  Motion.removeAllListeners()
  window.removeEventListener('resize', handleResize)
  scene.dispose()
  renderer.dispose()
})
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

canvas {
  display: block;
}

.debug-overlay {
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(255, 255, 255, 0.8);
}
</style>
