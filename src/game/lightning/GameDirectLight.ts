import * as THREE from 'three';

export class GameDirectLight extends THREE.DirectionalLight {
    constructor(x: number, y: number, z: number) {
        super(0xffffff, 0.8);
        this.position.set(x, y, z);
    }
}
