export const GAME_CONFIG = {
    // MainBoard dimensions
    PANEL_WIDTH: 60, // East-West
    PANEL_LENGTH: 600, // North-South
    WALL_HEIGHT: 2,
    WALL_THICKNESS: 1,

    // Ball properties
    BALL_RADIUS: 1,
    BOUNCE_DAMPING: 0.5,  // Controls bounce energy loss

    // Physics settings
    SENSITIVITY: 0.001,
    ACCELERATION_MULTIPLIER: 0.005,
    GRAVITY: 0.005,       // Controls how fast ball falls
    FRICTION: 0.95,

    // Jump mechanics
    BASE_JUMP_VELOCITY: 0,
    MAX_JUMP_VELOCITY: 0.75,
    JUMP_VELOCITY_INCREMENT: 0.01,  // Velocity increase per 500ms
    JUMP_COOLDOWN: 20,    // Milliseconds between jumps
    CHARGE_INTERVAL: 30,  // Milliseconds to increase jump velocity

    // MainCamera settings
    MIN_CAMERA_HEIGHT: 40,
    MAX_CAMERA_HEIGHT: 70,
    ZOOM_STEP: 5
};
