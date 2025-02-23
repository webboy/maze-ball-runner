import { Scene } from 'three';
import * as THREE from 'three';

export class MainScene extends Scene {
    constructor() {
        super();
        this.background = new THREE.Color(0xf0f0f0)
    }
}
