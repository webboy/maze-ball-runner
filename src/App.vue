// App.vue
<template>
  <div class="game-container">
    <canvas ref="canvas"></canvas>
    <q-card class="debug-card">
      <q-card-section>
        <div>X Tilt: {{ tilt.x.toFixed(2) }}</div>
        <div>Y Tilt: {{ tilt.y.toFixed(2) }}</div>
        <div>Ball X: {{ ballPosition.x.toFixed(2) }}</div>
        <div>Ball Y: {{ ballPosition.y.toFixed(2) }}</div>
      </q-card-section>
    </q-card>
    <div class="zoom-controls">
      <q-btn
        round
        color="primary"
        icon="add"
        @click="zoomIn"
        :disable="cameraHeight <= MIN_CAMERA_HEIGHT"
      />
      <q-btn
        round
        color="primary"
        icon="remove"
        @click="zoomOut"
        :disable="cameraHeight >= MAX_CAMERA_HEIGHT"
        class="q-ml-sm"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Motion } from '@capacitor/motion'
import * as THREE from 'three'

// Template refs
const canvas = ref(null)
const tilt = ref({ x: 0, y: 0 })
const ballPosition = ref({ x: 0, y: 0 })
const cameraHeight = ref(65)  // Initial camera height

// Game settings
const PANEL_SIZE = 30
const WALL_HEIGHT = 2
const WALL_THICKNESS = 1
const BALL_RADIUS = 1
const SENSITIVITY = 0.001
const FRICTION = 0.95
const MIN_CAMERA_HEIGHT = 40
const MAX_CAMERA_HEIGHT = 70
const ZOOM_STEP = 1

// Three.js components
let scene, camera, renderer, ball
let ballVelocity = new THREE.Vector3()

const createScene = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  const aspect = window.innerWidth / window.innerHeight
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000)
  camera.position.set(0, cameraHeight.value, 0)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true
  })
  renderer.setSize(window.innerWidth, window.innerHeight)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(10, 20, 10)
  scene.add(directionalLight)

  createBoard()
  createWalls()
  createBall()
}

const createBoard = () => {
  const geometry = new THREE.PlaneGeometry(PANEL_SIZE, PANEL_SIZE)
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.7
  })
  const board = new THREE.Mesh(geometry, material)
  board.rotation.x = -Math.PI / 2
  scene.add(board)
}

const createWalls = () => {
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    metalness: 0.2,
    roughness: 0.8
  })

  const walls = [
    { size: [PANEL_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT/2, -PANEL_SIZE/2] },
    { size: [PANEL_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT/2, PANEL_SIZE/2] },
    { size: [WALL_THICKNESS, WALL_HEIGHT, PANEL_SIZE], position: [-PANEL_SIZE/2, WALL_HEIGHT/2, 0] },
    { size: [WALL_THICKNESS, WALL_HEIGHT, PANEL_SIZE], position: [PANEL_SIZE/2, WALL_HEIGHT/2, 0] }
  ]

  walls.forEach(wall => {
    const geometry = new THREE.BoxGeometry(...wall.size)
    const mesh = new THREE.Mesh(geometry, wallMaterial)
    mesh.position.set(...wall.position)
    scene.add(mesh)
  })
}

const createBall = () => {
  const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32)

  // Create canvas for texture
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = 256
  canvas.height = 256

  // Create pattern
  context.fillStyle = '#e60000'  // Base red color
  context.fillRect(0, 0, canvas.width, canvas.height)

  // Add stripes
  context.fillStyle = '#ff3333'  // Lighter red for stripes
  const stripeWidth = canvas.width / 8
  for (let i = 0; i < canvas.height; i += stripeWidth * 2) {
    context.fillRect(0, i, canvas.width, stripeWidth)
  }

  // Add some circular patterns
  context.strokeStyle = '#cc0000'  // Darker red for circles
  context.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    const radius = canvas.width / 4 * (i + 1)
    context.beginPath()
    context.arc(canvas.width/2, canvas.height/2, radius, 0, Math.PI * 2)
    context.stroke()
  }

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0.3,
    roughness: 0.4
  })

  ball = new THREE.Mesh(geometry, material)
  ball.position.set(0, BALL_RADIUS, 0)
  scene.add(ball)
}

const updatePhysics = () => {
  ballVelocity.x += tilt.value.x * SENSITIVITY
  ballVelocity.z += tilt.value.y * SENSITIVITY

  ballVelocity.multiplyScalar(FRICTION)

  const nextX = ball.position.x + ballVelocity.x
  const nextZ = ball.position.z + ballVelocity.z

  const bounds = (PANEL_SIZE / 2) - BALL_RADIUS - (WALL_THICKNESS / 2)

  if (Math.abs(nextX) >= bounds) {
    ball.position.x = Math.sign(nextX) * bounds
    ballVelocity.x = 0
  } else {
    ball.position.x = nextX
  }

  if (Math.abs(nextZ) >= bounds) {
    ball.position.z = Math.sign(nextZ) * bounds
    ballVelocity.z = 0
  } else {
    ball.position.z = nextZ
  }

  ball.rotation.x += ballVelocity.z * 0.5
  ball.rotation.z -= ballVelocity.x * 0.5

  ballPosition.value = {
    x: ball.position.x,
    y: ball.position.z
  }
}

const zoomIn = () => {
  if (cameraHeight.value > MIN_CAMERA_HEIGHT) {
    cameraHeight.value = Math.max(MIN_CAMERA_HEIGHT, cameraHeight.value - ZOOM_STEP)
    updateCameraPosition()
  }
}

const zoomOut = () => {
  if (cameraHeight.value < MAX_CAMERA_HEIGHT) {
    cameraHeight.value = Math.min(MAX_CAMERA_HEIGHT, cameraHeight.value + ZOOM_STEP)
    updateCameraPosition()
  }
}

const updateCameraPosition = () => {
  if (camera) {
    camera.position.setY(cameraHeight.value)
    camera.lookAt(0, 0, 0)
  }
}

const handleResize = () => {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
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

const animate = () => {
  requestAnimationFrame(animate)
  updatePhysics()
  renderer.render(scene, camera)
}

onMounted(async () => {
  createScene()
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

.debug-card {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(255, 255, 255, 0.9);
}

.zoom-controls {
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  gap: 0.5rem;
}
</style>
