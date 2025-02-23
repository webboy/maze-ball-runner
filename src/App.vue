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
          :value="jumpChargeProgress"
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
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, shallowRef } from 'vue';
import { Motion } from '@capacitor/motion'
import { Game } from 'src/game/Game';
import { GAME_CONFIG } from 'src/game/configuration';

// Change gameInstance to be reactive
const gameInstance = shallowRef(null);

// Template refs
const canvas = ref(null)
const tilt = ref({ x: 0, y: 0 })
const acceleration = ref({ x: 0, y: 0, z: 0 })
const ballPosition = ref({ x: 0, y: 0 })
const cameraHeight = ref(70)  // Initial camera height

// Game settings
const PANEL_SIZE = 30
const WALL_HEIGHT = 5
const WALL_THICKNESS = 1
const MIN_CAMERA_HEIGHT = 40
const MAX_CAMERA_HEIGHT = 70
const ZOOM_STEP = 5

// Three.js components
let scene, camera, renderer, ball

const startJumpCharge = () => {
    if (gameInstance.value?.gameBall) {
        gameInstance.value.gameBall.ball.startJumpCharge();
    }
};

const currentCharge = ref(0);
// Update the computed property to use the reactive charge
const jumpChargeProgress = computed(() => {
    return currentCharge.value / GAME_CONFIG.MAX_JUMP_VELOCITY;
});

// Compute the color of the progress bar based on the charge
const jumpChargeColor = computed(() => {
    if (jumpChargeProgress.value < 0.5) {
        return 'primary';
    } else if (jumpChargeProgress.value < 0.8) {
        return 'warning';
    } else {
        return 'negative';
    }
});

// Update charge in an interval
const updateCharge = () => {
    if (gameInstance.value?.gameBall) {
        currentCharge.value = gameInstance.value.gameBall.ball.getJumpCharge();
    }
    requestAnimationFrame(updateCharge);
};

const executeJump = () => {
    if (gameInstance.value?.gameBall) {
        gameInstance.value.gameBall.ball.executeJump();
    }
};

const createScene = () => {

    gameInstance.value = new Game(
        canvas,
        GAME_CONFIG,
        cameraHeight
    )

    scene = gameInstance.value.scene
    camera = gameInstance.value.camera

    renderer = gameInstance.value.renderer

    const walls = [
        { size: [PANEL_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT/2, -PANEL_SIZE/2] },
        { size: [PANEL_SIZE, WALL_HEIGHT, WALL_THICKNESS], position: [0, WALL_HEIGHT/2, PANEL_SIZE/2] },
        { size: [WALL_THICKNESS, WALL_HEIGHT, PANEL_SIZE], position: [-PANEL_SIZE/2, WALL_HEIGHT/2, 0] },
        { size: [WALL_THICKNESS, WALL_HEIGHT, PANEL_SIZE], position: [PANEL_SIZE/2, WALL_HEIGHT/2, 0] },
        // N-S Divider
        { size: [WALL_THICKNESS, WALL_HEIGHT, PANEL_SIZE], position: [0, WALL_HEIGHT/2, 0] },
        // E-W Divider
        { size: [PANEL_SIZE, WALL_HEIGHT * 10, WALL_THICKNESS], position: [0, WALL_HEIGHT, 0] }
    ]

    gameInstance.value.constructWalls(walls)

    // Create ball
    ball = gameInstance.value.gameBall.ball
}

const updatePhysics = () => {
    ballPosition.value = gameInstance.value.updatePhysics(
        tilt.value,
        acceleration.value
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
    updateCharge();
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
