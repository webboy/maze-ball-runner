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

    updatePhysics = (tilt: Vector2D, acceleration: Vector3D): Vector2D => {
        // Update camera position
        this.updateCameraPosition()

        // Get reference to the ball's actual velocity
        const velocity = this.gameBall.ball.velocity;

        // Apply tilt forces
        velocity.x += tilt.x * this.gameOptions.SENSITIVITY
        velocity.z += tilt.y * this.gameOptions.SENSITIVITY

        // Apply acceleration forces for horizontal movement
        velocity.x -= acceleration.x * this.gameOptions.ACCELERATION_MULTIPLIER
        velocity.z += acceleration.z * this.gameOptions.ACCELERATION_MULTIPLIER

        // Apply gravity
        velocity.y -= this.gameOptions.GRAVITY

        // Apply friction to horizontal movement only
        velocity.x *= this.gameOptions.FRICTION
        velocity.z *= this.gameOptions.FRICTION

        // Update positions
        const nextX = this.gameBall.ball.position.x + velocity.x
        const nextY = this.gameBall.ball.position.y + velocity.y
        const nextZ = this.gameBall.ball.position.z + velocity.z

        // Handle horizontal bounds
        const bounds = (this.gameOptions.PANEL_SIZE / 2) - this.gameOptions.BALL_RADIUS - (this.gameOptions.WALL_THICKNESS / 2)

        // X-axis constraint
        if (Math.abs(nextX) >= bounds) {
            this.gameBall.ball.position.x = Math.sign(nextX) * bounds
            velocity.x = 0
        } else {
            this.gameBall.ball.position.x = nextX
        }

        // Z-axis constraint
        if (Math.abs(nextZ) >= bounds) {
            this.gameBall.ball.position.z = Math.sign(nextZ) * bounds
            velocity.z = 0
        } else {
            this.gameBall.ball.position.z = nextZ
        }

        // Y-axis constraint (ground)
        if (nextY <= this.gameOptions.BALL_RADIUS) {
            this.gameBall.ball.position.y = this.gameOptions.BALL_RADIUS
            if (velocity.y < 0) {  // Only bounce if moving downward
                velocity.y = -velocity.y * this.gameOptions.BOUNCE_DAMPING
            }
        } else {
            this.gameBall.ball.position.y = nextY
        }

        // Update ball rotation based on movement
        this.gameBall.ball.rotation.x += velocity.z * 0.5
        this.gameBall.ball.rotation.z -= velocity.x * 0.5

        // Update position for UI
        const ballPosition :Vector2D = {
            x: this.gameBall.ball.position.x,
            y: this.gameBall.ball.position.z
        }

        // Update shadow position and scale based on ball height
        if (this.gameBall.shadow) {
            this.gameBall.shadow.position.x = this.gameBall.ball.position.x
            this.gameBall.shadow.position.z = this.gameBall.ball.position.z

            // Adjust shadow scale based on ball height (more compressed when higher)
            const scale = Math.max(0.3, 1 - (this.gameBall.ball.position.y / (this.gameOptions.BALL_RADIUS * 10)))
            this.gameBall.shadow.scale.set(scale, scale, 1)
        }

        return ballPosition
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
}
