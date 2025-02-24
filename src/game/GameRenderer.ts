import { WebGLRenderer } from 'three';

export class GameRenderer extends WebGLRenderer {
    constructor(canvas: { value: HTMLCanvasElement }) {
        super({
            canvas: canvas.value,
            antialias: true
        });
        this.setPixelRatio(window.devicePixelRatio);
        this.setSize(window.innerWidth, window.innerHeight);
    }
}
