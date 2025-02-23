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
let scene, camera, renderer, ball, ballShadow
let ballVelocity = new THREE.Vector3()
let lastJumpTime = 0

// Jump charge tracking
let jumpChargeInterval = null
let jumpStartTime = 0

// Jump charge color based on charge level
const jumpChargeColor = computed(() => {
    // Return colors based on charge level. From green to red.
    if (jumpCharge.value < 0.25) return 'green'
    if (jumpCharge.value < 0.5) return 'yellow'
    if (jumpCharge.value < 0.75) return 'orange'
    return 'red'
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

const createScene = () => {

    const gameInstance = new Game(
        canvas,
        GAME_CONFIG,
        cameraHeight
    )

    scene = gameInstance.scene
    camera = gameInstance.camera

    renderer = gameInstance.renderer

    const walls = [
        { size: [PANEL_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT/2, -PANEL_SIZE/2] },
        { size: [PANEL_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT/2, PANEL_SIZE/2] },
        { size: [WALL_THICKNESS, WALL_HEIGHT, PANEL_SIZE], position: [-PANEL_SIZE/2, WALL_HEIGHT/2, 0] },
        { size: [WALL_THICKNESS, WALL_HEIGHT, PANEL_SIZE], position: [PANEL_SIZE/2, WALL_HEIGHT/2, 0] }
    ]

    gameInstance.constructWalls(walls)

    // Create ball
    ball = gameInstance.gameBall.ball

    // Create ball shadow
    ballShadow = gameInstance.gameBall.shadow
}

const updatePhysics = () => {
    // Update camera position
    updateCameraPosition()

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
