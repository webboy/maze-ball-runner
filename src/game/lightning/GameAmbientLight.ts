import * as THREE from 'three';

export class GameAmbientLight extends THREE.AmbientLight {
    constructor() {
        super(0xffffff, 0.9);
    }
}
