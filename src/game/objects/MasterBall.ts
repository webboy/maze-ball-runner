import * as THREE from 'three'
import { GAME_CONFIG } from 'src/game/configuration';

export class MasterBall extends THREE.Mesh {
    constructor() {
        const geometry = new THREE.SphereGeometry(GAME_CONFIG.BALL_RADIUS, 32, 32)
        // Create canvas for texture
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = 256
        canvas.height = 256

        if (!context) {
            throw new Error('Unable to obtain 2D context for the canvas');
        }

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

        super(geometry, material);

        this.position.set(0, GAME_CONFIG.BALL_RADIUS, 0)
    }
}
