// App.vue
<template>
  <div class="q-pa-md">
    <div
      ref="gameArea"
      class="game-area"
      :style="{
        position: 'relative',
        width: '100%',
        height: '80vh',
        border: '2px solid #333',
        borderRadius: '8px',
        overflow: 'hidden'
      }"
    >
      <div
        class="ball"
        :style="{
          position: 'absolute',
          left: `${ballPosition.x}px`,
          top: `${ballPosition.y}px`,
          width: '20px',
          height: '20px',
          backgroundColor: '#ff0000',
          borderRadius: '50%',
          transition: 'all 0.1s linear'
        }"
      ></div>
    </div>

    <q-card class="q-mt-md">
      <q-card-section>
        <div>X Tilt: {{ tilt.x.toFixed(2) }}</div>
        <div>Y Tilt: {{ tilt.y.toFixed(2) }}</div>
        <div>Ball X: {{ ballPosition.x.toFixed(2) }}</div>
        <div>Ball Y: {{ ballPosition.y.toFixed(2) }}</div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { Motion } from '@capacitor/motion'

interface Position {
  x: number
  y: number
}

interface Tilt {
  x: number
  y: number
}

export default defineComponent({
  name: 'BallGame',

  setup() {
    const gameArea = ref<HTMLElement | null>(null)
    const ballPosition = ref<Position>({ x: 0, y: 0 })
    const tilt = ref<Tilt>({ x: 0, y: 0 })
    let animationFrameId: number
    let areaWidth = 0
    let areaHeight = 0

    const initializeGame = () => {
      if (gameArea.value) {
        const rect = gameArea.value.getBoundingClientRect()
        areaWidth = rect.width
        areaHeight = rect.height

        // Start ball in center
        ballPosition.value = {
          x: areaWidth / 2 - 10, // 10 is half of ball width
          y: areaHeight / 2 - 10 // 10 is half of ball height
        }
      }
    }

    const startOrientation = async () => {
      try {
        console.log('Starting orientation tracking...');

        await Motion.addListener('orientation', event => {
          //console.log('Orientation data:', event);

          // Convert orientation data to tilt
          // beta is front-to-back tilt (-180° to 180°)
          // gamma is left-to-right tilt (-90° to 90°)
          const sensitivity = 0.1; // Reduced because angles are larger than acceleration
          tilt.value = {
            x: (event.gamma || 0) * sensitivity, // Left-right tilt
            y: (event.beta || 0) * sensitivity   // Front-back tilt
          };
        });
      } catch (error) {
        console.error('Error accessing device orientation:', error);
      }
    }

    const updateBallPosition = () => {
      // Calculate new position based on tilt with momentum
      const sensitivity = 2; // Base sensitivity
      const momentum = 1.2; // Momentum multiplier

      // Apply momentum to create smoother movement
      let velocityX = tilt.value.x * sensitivity * momentum;
      let velocityY = tilt.value.y * sensitivity * momentum;

      let newX = ballPosition.value.x + velocityX;
      let newY = ballPosition.value.y + velocityY;

      // Keep ball within bounds
      newX = Math.max(0, Math.min(newX, areaWidth - 20)) // 20 is ball width
      newY = Math.max(0, Math.min(newY, areaHeight - 20)) // 20 is ball height

      ballPosition.value = { x: newX, y: newY }

      animationFrameId = requestAnimationFrame(updateBallPosition)
    }

    onMounted(async () => {
      console.log('Component mounted');
      initializeGame();
      console.log('Game initialized');
      await startOrientation();
      console.log('Orientation tracking started');
      animationFrameId = requestAnimationFrame(updateBallPosition);
      console.log('Animation frame requested');

      window.addEventListener('resize', initializeGame);
    })

    onUnmounted(() => {
      Motion.removeAllListeners()
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', initializeGame)
    })

    return {
      gameArea,
      ballPosition,
      tilt
    }
  }
})
</script>

<style scoped>
.game-area {
  background: #f5f5f5;
}

.ball {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
