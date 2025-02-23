import { MasterBall } from 'src/game/objects/MasterBall';
import { MasterBallShadow } from 'src/game/objects/MasterBallShadow';

export interface GameWall {
    size: [number, number, number];
    position: [number, number, number];
}

export interface GameBall {
    ball: MasterBall
    shadow: MasterBallShadow
}

export interface Vector2D {
    x: number
    y: number
}

export interface Vector3D extends Vector2D {
    z: number
}
