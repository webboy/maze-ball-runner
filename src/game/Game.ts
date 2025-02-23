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

        // Add Board to the Scene
        this.constructBoard(this.gameOptions.PANEL_WIDTH, this.gameOptions.PANEL_LENGTH);

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
            // Get ball position and velocity
            const ballPosition = this.gameBall.ball.position;
            const ballVelocity = this.gameBall.ball.velocity;

            // Calculate the speed of the ball (magnitude of velocity vector)
            const ballSpeed = Math.sqrt(ballVelocity.x ** 2 + ballVelocity.z ** 2);

            // Use speed to alter camera height and lag
            const minCameraHeight = this.gameOptions.MIN_CAMERA_HEIGHT;
            const maxCameraHeight = this.gameOptions.MAX_CAMERA_HEIGHT;

            // Map speed to camera height (higher speed = lower camera height)
            const cameraHeight = maxCameraHeight - ((ballSpeed * 2) * (maxCameraHeight - minCameraHeight));

            // Ensure camera height doesn't go below the ball's position
            const adjustedCameraHeight = Math.max(cameraHeight, ballPosition.y + this.gameOptions.BALL_RADIUS);

            // Map speed to camera lag (higher speed = more lag behind the ball)
            const baseLagDistance = 10; // Default lag at zero speed
            const maxLagDistance = 50; // Maximum lag at full speed
            const cameraLag = baseLagDistance + (ballSpeed * (maxLagDistance - baseLagDistance));

            // Update camera position dynamically
            this.camera.position.setX(ballPosition.x); // Follow the ball's x-coordinate
            this.camera.position.setY(adjustedCameraHeight); // Dynamic height
            this.camera.position.setZ(ballPosition.z + cameraLag); // Dynamic lag behind ball

            // Make camera look at the ball's position
            this.camera.lookAt(
                ballPosition.x,
                ballPosition.y,
                ballPosition.z
            );
        }
    };

    // Game.ts
    private handleWallCollisions(position: THREE.Vector3, velocity: THREE.Vector3): void {
        const ballRadius = this.gameOptions.BALL_RADIUS;

        // Check all walls
        this.wallObjects.forEach(wall => {
            const wallBox = new THREE.Box3().setFromObject(wall);

            // First check if we're within the wall's horizontal bounds
            if (wallBox.min.x - ballRadius < position.x && position.x < wallBox.max.x + ballRadius &&
                wallBox.min.z - ballRadius < position.z && position.z < wallBox.max.z + ballRadius) {

                // Then check vertical collision
                if (position.y < wallBox.max.y && position.y + ballRadius > wallBox.min.y) {
                    // Determine which side of the wall we hit
                    const distToLeft = Math.abs(position.x - wallBox.min.x);
                    const distToRight = Math.abs(position.x - wallBox.max.x);
                    const distToFront = Math.abs(position.z - wallBox.min.z);
                    const distToBack = Math.abs(position.z - wallBox.max.z);
                    const distToTop = Math.abs(position.y - wallBox.max.y);

                    const minDist = Math.min(distToLeft, distToRight, distToFront, distToBack, distToTop);

                    if (minDist === distToTop && velocity.y < 0) {
                        // Hit top of wall
                        position.y = wallBox.max.y + ballRadius;
                        velocity.y = -velocity.y * this.gameOptions.BOUNCE_DAMPING;
                    }
                    else if (minDist === distToLeft && velocity.x > 0) {
                        // Hit left side
                        position.x = wallBox.min.x - ballRadius;
                        velocity.x = -velocity.x * this.gameOptions.BOUNCE_DAMPING;
                    }
                    else if (minDist === distToRight && velocity.x < 0) {
                        // Hit right side
                        position.x = wallBox.max.x + ballRadius;
                        velocity.x = -velocity.x * this.gameOptions.BOUNCE_DAMPING;
                    }
                    else if (minDist === distToFront && velocity.z > 0) {
                        // Hit front side
                        position.z = wallBox.min.z - ballRadius;
                        velocity.z = -velocity.z * this.gameOptions.BOUNCE_DAMPING;
                    }
                    else if (minDist === distToBack && velocity.z < 0) {
                        // Hit back side
                        position.z = wallBox.max.z + ballRadius;
                        velocity.z = -velocity.z * this.gameOptions.BOUNCE_DAMPING;
                    }
                }
            }
        });

        // Always check board boundaries
        const xBounds = (this.gameOptions.PANEL_WIDTH / 2) - ballRadius;
        const zBounds = (this.gameOptions.PANEL_LENGTH / 2) - ballRadius;

        position.x = Math.max(-xBounds, Math.min(xBounds, position.x));
        position.z = Math.max(-zBounds, Math.min(zBounds, position.z));

    }

    // Add a helper method to predict if a move would result in collision
    private predictCollision(position: THREE.Vector3, velocity: THREE.Vector3): boolean {
        const nextPosition = position.clone().add(velocity);
        const ballRadius = this.gameOptions.BALL_RADIUS;

        for (const wall of this.wallObjects) {
            const wallBox = new THREE.Box3().setFromObject(wall);

            // Check if next position would be inside wall bounds
            if (wallBox.min.x - ballRadius < nextPosition.x && nextPosition.x < wallBox.max.x + ballRadius &&
                wallBox.min.z - ballRadius < nextPosition.z && nextPosition.z < wallBox.max.z + ballRadius &&
                nextPosition.y < wallBox.max.y && nextPosition.y + ballRadius > wallBox.min.y) {
                return true;
            }
        }
        return false;
    }

    updatePhysics = (tilt: Vector2D, acceleration: Vector3D): Vector2D => {
        this.updateCameraPosition();

        const velocity = this.gameBall.ball.velocity;
        const position = this.gameBall.ball.position;
        const originalPosition = position.clone();
        const originalVelocity = velocity.clone();

        // Apply forces
        velocity.x += tilt.x * this.gameOptions.SENSITIVITY;
        velocity.z += tilt.y * this.gameOptions.SENSITIVITY;
        velocity.x -= acceleration.x * this.gameOptions.ACCELERATION_MULTIPLIER;
        velocity.z += acceleration.z * this.gameOptions.ACCELERATION_MULTIPLIER;
        velocity.y -= this.gameOptions.GRAVITY;

        // Apply air friction
        velocity.x *= this.gameOptions.FRICTION;
        velocity.z *= this.gameOptions.FRICTION;

        // Check if next move would cause collision
        if (this.predictCollision(position, velocity)) {
            // If collision predicted, move in smaller steps
            const steps = 5;  // Divide movement into 5 steps
            const stepVelocity = velocity.clone().multiplyScalar(1/steps);

            for (let i = 0; i < steps; i++) {
                position.add(stepVelocity);
                this.handleWallCollisions(position, velocity);
            }
        } else {
            // No collision predicted, move normally
            position.add(velocity);
            this.handleWallCollisions(position, velocity);
        }

        // Ground handling
        if (position.y <= this.gameOptions.BALL_RADIUS) {
            position.y = this.gameOptions.BALL_RADIUS;
            if (velocity.y < 0) {
                velocity.y = -velocity.y * this.gameOptions.BOUNCE_DAMPING;
            }
        }

        // Update ball rotation and shadow as before
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
