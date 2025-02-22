// App.vue
<template>
  <div class="game-container">
    <canvas ref="canvas"></canvas>
    <q-card class="debug-card">
      <q-card-section>
        <div>X Tilt: {{ tilt.x.toFixed(2) }}</div>
        <div>Y Tilt: {{ tilt.y.toFixed(2) }}</div>
        <div>X Accel: {{ acceleration.x.toFixed(2) }}</div>
        <div>Y Accel: {{ acceleration.y.toFixed(2) }}</div>
        <div>Ball X: {{ ballPosition.x.toFixed(2) }}</div>
        <div>Ball Y: {{ ballPosition.y.toFixed(2) }}</div>
        <div>Jump Charge: {{ jumpCharge.toFixed(2) }}</div>
      </q-card-section>
    </q-card>
    <div class="zoom-controls">
      <q-fab
        icon="camera"
        direction="up"
      >
        <q-fab-action
          color="primary"
          icon="zoom_in"
          @click.stop="zoomIn"
          :disable="cameraHeight <= MIN_CAMERA_HEIGHT"
        />
        <q-fab-action
          color="primary"
          icon="zoom_out"
          @click.stop="zoomOut"
          :disable="cameraHeight >= MAX_CAMERA_HEIGHT"
        />
      </q-fab>
    </div>
    <div class="jump-controls">
      <q-btn
        size="lg"
        rounded
        color="secondary"
        icon="arrow_upward"
        @mousedown="startJumpCharge"
        @mouseup="executeJump"
        @touchstart.prevent="startJumpCharge"
        @touchend.prevent="executeJump"
        :disable="!canJump"
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
const acceleration = ref({ x: 0, y: 0, z: 0 })
const ballPosition = ref({ x: 0, y: 0 })
const cameraHeight = ref(70)  // Initial camera height
const canJump = ref(true)  // Track if ball can jump
const jumpCharge = ref(0)  // Track jump charge level

// Game settings
const PANEL_SIZE = 30
const WALL_HEIGHT = 2
const WALL_THICKNESS = 1
const BALL_RADIUS = 1
const SENSITIVITY = 0.001
const ACCELERATION_MULTIPLIER = 0.005
const BASE_JUMP_VELOCITY = 0  // Base jump velocity
const MAX_JUMP_VELOCITY = 0.75   // Maximum jump velocity
const JUMP_VELOCITY_INCREMENT = 0.01  // Velocity increase per 500ms
const GRAVITY = 0.005      // Controls how fast ball falls
const FRICTION = 0.95
const MIN_CAMERA_HEIGHT = 40
const MAX_CAMERA_HEIGHT = 70
const ZOOM_STEP = 5
const BOUNCE_DAMPING = 0.5 // Controls bounce energy loss
const JUMP_COOLDOWN = 20  // Milliseconds between jumps
const CHARGE_INTERVAL = 30  // Milliseconds to increase jump velocity

// Three.js components
let scene, camera, renderer, ball
let ballVelocity = new THREE.Vector3()
let lastJumpTime = 0

// Jump charge tracking
let jumpChargeInterval = null
let jumpStartTime = 0

const startJumpCharge = () => {
  if (!canJump.value) return

  jumpStartTime = Date.now()
  jumpCharge.value = BASE_JUMP_VELOCITY

  // Increase jump charge at set intervals
  jumpChargeInterval = setInterval(() => {
    jumpCharge.value = Math.min(
      MAX_JUMP_VELOCITY,
      BASE_JUMP_VELOCITY + Math.floor((Date.now() - jumpStartTime) / CHARGE_INTERVAL) * JUMP_VELOCITY_INCREMENT
    )
  }, CHARGE_INTERVAL)
}

const executeJump = () => {
  // Clear the interval
  if (jumpChargeInterval) {
    clearInterval(jumpChargeInterval)
    jumpChargeInterval = null
  }

  const currentTime = Date.now()
  // Check if ball is on ground and enough time has passed since last jump
  if (ball.position.y <= BALL_RADIUS && currentTime - lastJumpTime > JUMP_COOLDOWN) {
    ballVelocity.y = jumpCharge.value
    lastJumpTime = currentTime
    canJump.value = false

    // Reset jump charge
    jumpCharge.value = 0

    // Re-enable jumping after a short delay
    setTimeout(() => {
      canJump.value = true
    }, JUMP_COOLDOWN)
  }

  // Reset jump charge
  jumpCharge.value = 0
}

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

  // Create canvas for tile texture
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = 512
  canvas.height = 512

  // Set background color
  context.fillStyle = '#f0f0f0'
  context.fillRect(0, 0, canvas.width, canvas.height)

  // Draw tile grid
  const tileSize = canvas.width / 10  // 10x10 grid
  context.strokeStyle = '#e0e0e0'
  context.lineWidth = 2

  // Vertical lines
  for (let x = 0; x <= 10; x++) {
    context.beginPath()
    context.moveTo(x * tileSize, 0)
    context.lineTo(x * tileSize, canvas.height)
    context.stroke()
  }

  // Horizontal lines
  for (let y = 0; y <= 10; y++) {
    context.beginPath()
    context.moveTo(0, y * tileSize)
    context.lineTo(canvas.width, y * tileSize)
    context.stroke()
  }

  // Slight texture variation
  context.globalAlpha = 0.05
  context.fillStyle = 'black'
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      if ((x + y) % 2 === 0) {
        context.fillRect(x * tileSize, y * tileSize, tileSize, tileSize)
      }
    }
  }
  context.globalAlpha = 1

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 3)  // Adjust repeat to match board size

  const material = new THREE.MeshStandardMaterial({
    map: texture,
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

let ballShadow

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

  // Create ball shadow
  const shadowGeometry = new THREE.CircleGeometry(BALL_RADIUS, 32)
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3
  })
  ballShadow = new THREE.Mesh(shadowGeometry, shadowMaterial)
  ballShadow.rotation.x = -Math.PI / 2  // Rotate to lie flat on the ground
  ballShadow.position.set(0, 0.01, 0)  // Slightly above ground to prevent z-fighting
  scene.add(ballShadow)
}

const updatePhysics = () => {
  // Apply tilt forces
  ballVelocity.x += tilt.value.x * SENSITIVITY
  ballVelocity.z += tilt.value.y * SENSITIVITY

  // Apply acceleration forces for horizontal movement
  ballVelocity.x -= acceleration.value.x * ACCELERATION_MULTIPLIER
  ballVelocity.z += acceleration.value.z * ACCELERATION_MULTIPLIER

  // Apply gravity
  ballVelocity.y -= GRAVITY

  // Apply friction to horizontal movement only
  ballVelocity.x *= FRICTION
  ballVelocity.z *= FRICTION

  // Update positions
  const nextX = ball.position.x + ballVelocity.x
  const nextY = ball.position.y + ballVelocity.y
  const nextZ = ball.position.z + ballVelocity.z

  // Handle horizontal bounds
  const bounds = (PANEL_SIZE / 2) - BALL_RADIUS - (WALL_THICKNESS / 2)

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

  // Y-axis constraint (ground)
  if (nextY <= BALL_RADIUS) {
    ball.position.y = BALL_RADIUS
    if (ballVelocity.y < 0) {  // Only bounce if moving downward
      ballVelocity.y = -ballVelocity.y * BOUNCE_DAMPING
    }
  } else {
    ball.position.y = nextY
  }

  // Update ball rotation based on movement
  ball.rotation.x += ballVelocity.z * 0.5
  ball.rotation.z -= ballVelocity.x * 0.5

  // Update position for UI
  ballPosition.value = {
    x: ball.position.x,
    y: ball.position.z
  }

  // Update shadow position and scale based on ball height
  if (ballShadow) {
    ballShadow.position.x = ball.position.x
    ballShadow.position.z = ball.position.z

    // Adjust shadow scale based on ball height (more compressed when higher)
    const heightFactor = Math.max(0.3, 1 - (ball.position.y / (BALL_RADIUS * 10)))
    ballShadow.scale.set(heightFactor, heightFactor, 1)
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

const startSensors = async () => {
  try {
    // Start orientation sensor
    await Motion.addListener('orientation', event => {
      tilt.value = {
        x: event.gamma || 0,
        y: event.beta || 0
      }
    })

    // Start accelerometer
    await Motion.addListener('accel', event => {
      acceleration.value = {
        x: event.acceleration.x || 0,    // phone's X (left/right)
        y: event.acceleration.z || 0,    // phone's Z becomes our Y (up/down)
        z: -event.acceleration.y || 0    // phone's -Y becomes our Z (forward/back)
      }
    })
  } catch (error) {
    console.error('Error accessing device sensors:', error)
  }
}

const animate = () => {
  requestAnimationFrame(animate)
  updatePhysics()
  renderer.render(scene, camera)
}

onMounted(async () => {
  createScene()
  await startSensors()
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

.jump-controls {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
}
</style>
