import { MainScene } from 'src/game/scenes/MainScene';
import { MainCamera } from 'src/game/objects/MainCamera';
import { GameAmbientLight } from 'src/game/lightning/GameAmbientLight';
import { GameDirectLight } from 'src/game/lightning/GameDirectLight';
import { GameRenderer } from 'src/game/GameRenderer';
import { GAME_CONFIG} from 'src/game/configuration';
import { MainBoard } from 'src/game/objects/MainBoard';
import { GameBall, GameWall, Vector2D, Vector3D } from 'src/game/types';
import * as THREE from 'three';
import { Wall } from 'src/game/objects/Wall';
import { MasterBall } from 'src/game/objects/MasterBall';
import { MasterBallShadow } from 'src/game/objects/MasterBallShadow';
import { Ref } from 'vue';


export class Game{
    // Define properties. Scene, Renderer, MainCamera, etc.
    scene: MainScene
    camera: MainCamera
    renderer: GameRenderer
    gameBall: GameBall
    gameOptions: typeof GAME_CONFIG
    cameraHeight: Ref<number>
    private raycaster: THREE.Raycaster
    private wallObjects: Wall[] = []

    constructor(canvas: { value: HTMLCanvasElement }, gameOptions: typeof GAME_CONFIG, cameraHeight: Ref<number>) {
        console.log('Initializing the game...');
        // Setting game configuration
        this.gameOptions = gameOptions

        // Creating Scene
        this.scene = new MainScene();

        // Creating Camera
        this.camera = new MainCamera();

        // Create lights
        const ambientLight = new GameAmbientLight();
        const directionalLight = new GameDirectLight(10, 20, 10);

        // Add lights to the scene
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

        // Create renderer
        this.renderer = new GameRenderer(canvas);

        // Add Board to the scene
        this.constructBoard(this.gameOptions.PANEL_SIZE, this.gameOptions.PANEL_SIZE);

        // Add Game Ball
        this.gameBall = this.constructGameBall();
        this.scene.add(this.gameBall.ball);
        this.scene.add(this.gameBall.shadow);

        // Set Camera Height
        this.cameraHeight = cameraHeight;

        // Create raycaster for collision detection
        this.raycaster = new THREE.Raycaster();
    }

    constructBoard = (width: number, height: number): void => {
        console.log('Creating the board...');
        // Create board and add it to the scene
        this.scene.add(new MainBoard(width, height))
    }

    constructWalls = (walls: GameWall[]):void => {
        console.log('Creating walls...');
        // Create walls
        walls.forEach(wall => {
            const geometry = new THREE.BoxGeometry(...wall.size)
            const WallObject = new Wall(geometry, wall.position)
            this.scene.add(WallObject)
            this.wallObjects.push(WallObject)
        })
    }

    constructGameBall = (): GameBall => {
        console.log('Creating the ball...');
        // Create ball and shadow
        return {
            ball: new MasterBall(this.gameOptions),
            shadow: new MasterBallShadow()
        }
    }

    updateCameraPosition = () => {
        if (this.camera && this.gameBall) {
            // Position camera above and slightly behind the ball
            this.camera.position.setX(this.gameBall.ball.position.x)
            this.camera.position.setZ(this.gameBall.ball.position.z + 10) // Offset camera behind ball
            this.camera.position.setY(this.cameraHeight.value)

            // Make camera look at the ball's position
            this.camera.lookAt(
                this.gameBall.ball.position.x,
                this.gameBall.ball.position.y,
                this.gameBall.ball.position.z
            )
        }
    }

    // Game.ts
    private checkCollisions(position: THREE.Vector3, velocity: THREE.Vector3): boolean {
        const directions = [
            new THREE.Vector3(1, 0, 0),   // right
            new THREE.Vector3(-1, 0, 0),  // left
            new THREE.Vector3(0, 0, 1),   // forward
            new THREE.Vector3(0, 0, -1),  // backward
            new THREE.Vector3(1, 0, 1).normalize(),   // forward-right
            new THREE.Vector3(-1, 0, 1).normalize(),  // forward-left
            new THREE.Vector3(1, 0, -1).normalize(),  // backward-right
            new THREE.Vector3(-1, 0, -1).normalize()  // backward-left
        ];

        let hasCollision = false;
        const ballRadius = this.gameOptions.BALL_RADIUS;

        for (const direction of directions) {
            this.raycaster.set(position, direction);
            const intersects = this.raycaster.intersectObjects(this.wallObjects);

            if (intersects.length > 0 && intersects[0].distance < ballRadius + 0.05) {
                hasCollision = true;
                const collision = intersects[0];

                if (collision.face) {
                    // Get the normal of the wall we hit
                    const normal = collision.face.normal.clone();

                    // Calculate dot product to determine velocity into wall
                    const dot = velocity.dot(normal);

                    if (dot < 0) {
                        // Calculate the velocity component going into the wall
                        const normalVelocity = normal.multiplyScalar(dot);

                        // Calculate the velocity component parallel to the wall
                        const tangentVelocity = new THREE.Vector3()
                            .copy(velocity)
                            .sub(normalVelocity);

                        // Reflect the normal component and apply damping
                        normalVelocity.multiplyScalar(-this.gameOptions.BOUNCE_DAMPING);

                        // Keep the tangent component (with some friction)
                        tangentVelocity.multiplyScalar(1); // No friction

                        // Combine the velocities
                        velocity.copy(normalVelocity).add(tangentVelocity);
                    }

                    // Push ball out of wall with minimal buffer
                    const penetrationDepth = ballRadius - collision.distance;
                    if (penetrationDepth > 0) {
                        position.add(normal.multiplyScalar(penetrationDepth + 0.001));
                    }
                }
            }
        }

        // Fallback boundary check with similar physics
        const bounds = (this.gameOptions.PANEL_SIZE / 2) - ballRadius - (this.gameOptions.WALL_THICKNESS / 2);

        // Handle X bounds
        if (Math.abs(position.x) > bounds) {
            const sign = Math.sign(position.x);
            position.x = sign * bounds;

            // Only affect X component of velocity
            if (sign * velocity.x > 0) {
                velocity.x = -velocity.x * this.gameOptions.BOUNCE_DAMPING;
            }
            hasCollision = true;
        }

        // Handle Z bounds
        if (Math.abs(position.z) > bounds) {
            const sign = Math.sign(position.z);
            position.z = sign * bounds;

            // Only affect Z component of velocity
            if (sign * velocity.z > 0) {
                velocity.z = -velocity.z * this.gameOptions.BOUNCE_DAMPING;
            }
            hasCollision = true;
        }

        return hasCollision;
    }

    updatePhysics = (tilt: Vector2D, acceleration: Vector3D): Vector2D => {
        this.updateCameraPosition();

        const velocity = this.gameBall.ball.velocity;
        const position = this.gameBall.ball.position;
        const originalPosition = position.clone();

        // Apply forces
        velocity.x += tilt.x * this.gameOptions.SENSITIVITY;
        velocity.z += tilt.y * this.gameOptions.SENSITIVITY;
        velocity.x -= acceleration.x * this.gameOptions.ACCELERATION_MULTIPLIER;
        velocity.z += acceleration.z * this.gameOptions.ACCELERATION_MULTIPLIER;
        velocity.y -= this.gameOptions.GRAVITY;

        // Apply air friction
        velocity.x *= this.gameOptions.FRICTION;
        velocity.z *= this.gameOptions.FRICTION;

        // Update position
        position.add(velocity);

        // Handle collisions
        if (this.checkCollisions(position, velocity)) {
            // Double check we're not stuck
            if (this.checkCollisions(position, velocity)) {
                position.copy(originalPosition);
                // Allow slight movement along walls even when "stuck"
                position.add(velocity.clone().multiplyScalar(0.1));
            }
        }

        // Ground handling
        if (position.y <= this.gameOptions.BALL_RADIUS) {
            position.y = this.gameOptions.BALL_RADIUS;
            if (velocity.y < 0) {
                velocity.y = -velocity.y * this.gameOptions.BOUNCE_DAMPING;
            }
        }

        // Update ball rotation and shadow
        this.gameBall.ball.rotation.x += velocity.z * 0.5;
        this.gameBall.ball.rotation.z -= velocity.x * 0.5;

        if (this.gameBall.shadow) {
            this.gameBall.shadow.position.x = position.x;
            this.gameBall.shadow.position.z = position.z;
            const scale = Math.max(0.3, 1 - (position.y / (this.gameOptions.BALL_RADIUS * 10)));
            this.gameBall.shadow.scale.set(scale, scale, 1);
        }

        return {
            x: position.x,
            y: position.z
        };
    }
}
