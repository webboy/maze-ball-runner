import { GAME_CONFIG } from 'src/game/configuration';

export class JumpController {
    public currentCharge: number = 0;
    private lastJumpTime: number = 0;
    private jumpChargeInterval: number | null = null;
    private jumpStartTime: number = 0;
    private gameOptions: typeof GAME_CONFIG;

    constructor(gameOptions: typeof GAME_CONFIG) {
        this.gameOptions = gameOptions;
    }

    startCharge(): void {
        if (!this.canJump()) return;

        this.jumpStartTime = Date.now();
        this.currentCharge = this.gameOptions.BASE_JUMP_VELOCITY;

        if (this.jumpChargeInterval) {
            clearInterval(this.jumpChargeInterval);
        }

        this.jumpChargeInterval = window.setInterval(() => {
            this.currentCharge = Math.min(
                this.gameOptions.MAX_JUMP_VELOCITY,
                this.gameOptions.BASE_JUMP_VELOCITY +
                Math.floor((Date.now() - this.jumpStartTime) / this.gameOptions.CHARGE_INTERVAL) *
                this.gameOptions.JUMP_VELOCITY_INCREMENT
            );
        }, this.gameOptions.CHARGE_INTERVAL);
    }

    executeJump(): number {
        if (this.jumpChargeInterval) {
            clearInterval(this.jumpChargeInterval);
            this.jumpChargeInterval = null;
        }

        const jumpVelocity = this.currentCharge;
        this.currentCharge = 0;
        this.lastJumpTime = Date.now();

        return jumpVelocity;
    }

    canJump(): boolean {
        return Date.now() - this.lastJumpTime > this.gameOptions.JUMP_COOLDOWN;
    }
}
