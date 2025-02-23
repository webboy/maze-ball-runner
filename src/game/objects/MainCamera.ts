import { PerspectiveCamera } from 'three';

export class MainCamera extends PerspectiveCamera{
    constructor() {
        const aspect = window.innerWidth / window.innerHeight

        super(50, aspect, 0.1, 1000)
        this.position.set(0, 50, 0);
        this.lookAt(0, 0, 0);
    }
}
