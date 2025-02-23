// App.vue
<template>
  <div class="game-container">
    <canvas ref="canvas"></canvas>
    <q-card class="debug-card full-width">
      <q-card-section>
        <div class="row">
          <div class="col-6">
            <q-list dense>
              <q-item>
                <q-item-section>X Tilt:</q-item-section>
                <q-item-section>{{ tilt.x.toFixed(2) }}</q-item-section>
              </q-item>
              <q-item>
                <q-item-section>X Accel:</q-item-section>
                <q-item-section>{{ acceleration.x.toFixed(2) }}</q-item-section>
              </q-item>
              <q-item>
                <q-item-section>Ball X:</q-item-section>
                <q-item-section>{{ ballPosition.x.toFixed(2) }}</q-item-section>
              </q-item>
            </q-list>
          </div>
          <div class="col-6">
            <q-list dense>
              <q-item>
                <q-item-section>Y Tilt:</q-item-section>
                <q-item-section>{{ tilt.y.toFixed(2) }}</q-item-section>
              </q-item>
              <q-item>
                <q-item-section>Y Accel:</q-item-section>
                <q-item-section>{{ acceleration.y.toFixed(2) }}</q-item-section>
              </q-item>
              <q-item>
                <q-item-section>Ball Y:</q-item-section>
                <q-item-section>{{ ballPosition.y.toFixed(2) }}</q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </q-card-section>
      <q-card-section>
        <q-linear-progress
          :value="(jumpCharge.toFixed(2)/MAX_JUMP_VELOCITY)"
          :color="jumpChargeColor"
          :animation-speed="0"
          />
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
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Motion } from '@capacitor/motion'
import * as THREE from 'three'
import { Game } from 'src/game/Game';
import { GAME_CONFIG } from 'src/game/configuration';

// Template refs
const canvas = ref(null)
const tilt = ref({ x: 0, y: 0 })
const acceleration = ref({ x: 0, y: 0, z: 0 })
const ballPosition = ref({ x: 0, y: 0 })
const cameraHeight = ref(70)  // Initial camera height
const canJump = ref(true)  // Track if ball can jump
const jumpCharge = ref(0)  // Track jump charge level

// Game settings
const BALL_RADIUS = 1
const BASE_JUMP_VELOCITY = 0  // Base jump velocity
const MAX_JUMP_VELOCITY = 0.75   // Maximum jump velocity
const JUMP_VELOCITY_INCREMENT = 0.01  // Velocity increase per 500ms
const MIN_CAMERA_HEIGHT = 40
const MAX_CAMERA_HEIGHT = 70
const ZOOM_STEP = 5
const JUMP_COOLDOWN = 20  // Milliseconds between jumps
const CHARGE_INTERVAL = 30  // Milliseconds to increase jump velocity

// Three.js components
let scene, camera, renderer, ball, GameInstance
let ballVelocity = new THREE.Vector3()
let lastJumpTime = 0

// Jump charge tracking
let jumpChargeInterval = null
let jumpStartTime = 0

// Jump charge gauge color
const jumpChargeColor = computed(() => {
  const chargePercent = jumpCharge.value / MAX_JUMP_VELOCITY
  // Use green, yellow, orange and red colors based on charge level
  if (chargePercent < 0.5) {
    return 'green'
  } else if (chargePercent < 0.75) {
    return 'yellow'
  } else if (chargePercent < 0.9) {
    return 'orange'
  } else {
    return 'red'
  }
})


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



const createGame = () => {
    GameInstance = new Game(
        canvas,
        GAME_CONFIG,
        cameraHeight
    )

    // const walls = [
    //     { size: [PANEL_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT/2, -PANEL_SIZE/2] },
    //     { size: [PANEL_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT/2, PANEL_SIZE/2] },
    //     { size: [WALL_THICKNESS, WALL_HEIGHT, PANEL_SIZE], position: [-PANEL_SIZE/2, WALL_HEIGHT/2, 0] },
    //     { size: [WALL_THICKNESS, WALL_HEIGHT, PANEL_SIZE], position: [PANEL_SIZE/2, WALL_HEIGHT/2, 0] }
    // ]

    //GameInstance.constructWalls(walls)
}

const updatePhysics = () => {
    GameInstance.updatePhysics(
        ballVelocity,
        tilt,
        acceleration,
        ballPosition
    )
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
    // Position camera above and slightly behind the ball
    camera.position.setX(ball.position.x)
    camera.position.setZ(ball.position.z + 10) // Offset camera behind ball
    camera.position.setY(cameraHeight.value)

    // Make camera look at the ball's position
    camera.lookAt(
      ball.position.x,
      ball.position.y,
      ball.position.z
    )
  }
}

const handleResize = () => {
  const width = window.innerWidth
  const height = window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
    GameInstance.renderer.setSize(width, height)
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
    GameInstance.renderer.render(scene, camera)
}

onMounted(async () => {
    createGame()
  await startSensors()
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  Motion.removeAllListeners()
  window.removeEventListener('resize', handleResize)
  scene.dispose()
    GameInstance.renderer.dispose()
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
  top: 1px;
  left: 1px;
  background: rgba(255, 255, 255, 0.6);
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
