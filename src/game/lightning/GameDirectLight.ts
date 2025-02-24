import * as THREE from 'three';

export class GameDirectLight extends THREE.DirectionalLight {
    constructor(x: number, y: number, z: number) {
        super(0xffffff, 1.8);
        this.position.set(x, y, z);

        // Set DirectionalLight shadow properties
        this.shadow.mapSize.width = 1024;
        this.shadow.mapSize.height = 1024;
        this.shadow.camera.near = 0.5;
        this.shadow.camera.far = 500;
        this.shadow.camera.left = -100;
        this.shadow.camera.right = 100;
        this.shadow.camera.top = 100;
        this.shadow.camera.bottom = -100;

        // Enable shadow casting
        this.castShadow = true;
    }
}
