import * as THREE from 'three';
import { GAME_CONFIG } from 'src/game/configuration';

export class MasterBallShadow extends THREE.Mesh {
    constructor() {
        // Create ball shadow
        const shadowGeometry = new THREE.CircleGeometry(GAME_CONFIG.BALL_RADIUS, 32)
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        })
        super(shadowGeometry, shadowMaterial)

        this.rotation.x = -Math.PI / 2  // Rotate to lie flat on the ground
        this.position.set(0, 0.01, 0)  // Slightly above ground to prevent z-fighting
    }
}
