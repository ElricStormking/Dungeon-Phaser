import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';

/**
 * Handles snake movement, direction changes, and follower positioning
 */
export default class MovementSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Movement properties
        this.direction = 'right';
        this.nextDirection = 'right';
        this.moveTimer = 0;
        this.moveDelay = 150;
        this.effectiveMoveDelay = 150;
        this.lastEffectiveDelay = 150;
        this.collisionCooldown = false;
        this.boundaryCollisionCooldown = false;
    }
    
    /**
     * Update movement and follow behavior
     * @param {number} time - Current game time
     */
    update(time) {
        if (this.scene.gameOver) return;
        
        // Calculate move delay based on player speed
        if (this.scene.player) {
            // Get the player's current terrain slowFactor (1.0 is normal/no slowdown)
            const terrainEffect = this.scene.terrainSystem?.getTerrainAt(this.scene.player.x, this.scene.player.y);
            const slowFactor = terrainEffect?.slowFactor || 1.0;
            
            // Only adjust delay if the player is on slowing terrain
            if (slowFactor < 1.0) {
                // Calculate effective delay (higher when slower)
                this.effectiveMoveDelay = this.moveDelay / slowFactor;
                
                // For debugging
                if (this.lastEffectiveDelay !== this.effectiveMoveDelay) {
                    this.lastEffectiveDelay = this.effectiveMoveDelay;
                    console.log(`Move delay adjusted: ${this.effectiveMoveDelay.toFixed(2)} (slowFactor: ${slowFactor})`);
                }
            } else {
                // Reset to normal speed on normal terrain
                this.effectiveMoveDelay = this.moveDelay;
                
                // For debugging
                if (this.lastEffectiveDelay !== this.effectiveMoveDelay) {
                    this.lastEffectiveDelay = this.effectiveMoveDelay;
                    console.log(`Move delay reset to normal: ${this.moveDelay}`);
                }
            }
        }
        
        // Move the snake periodically based on effectiveMoveDelay
        if (time > this.moveTimer) {
            this.moveSnake();
            this.moveTimer = time + (this.effectiveMoveDelay || this.moveDelay);
        }
    }
    
    /**
     * Handle input for direction changes
     * @param {object} cursors - Input cursors
     */
    handleInput(cursors) {
        let dx = 0;
        let dy = 0;
        
        // Determine input direction
        if (cursors.left.isDown || cursors.keyA.isDown) dx = -1;
        else if (cursors.right.isDown || cursors.keyD.isDown) dx = 1;
        if (cursors.up.isDown || cursors.keyW.isDown) dy = -1;
        else if (cursors.down.isDown || cursors.keyS.isDown) dy = 1;
        
        // Update nextDirection based on input, preventing reversal
        if (dx < 0 && this.direction !== 'right') this.nextDirection = 'left';
        else if (dx > 0 && this.direction !== 'left') this.nextDirection = 'right';
        else if (dy < 0 && this.direction !== 'down') this.nextDirection = 'up';
        else if (dy > 0 && this.direction !== 'up') this.nextDirection = 'down';
    }
    
    /**
     * Move the snake (player and followers)
     */
    moveSnake() {
        const player = this.scene.player;
        if (!player) return;
        
        // Create positions array from current positions
        const positions = [];
        positions.push({ x: player.x, y: player.y, dir: this.direction });
        
        // Create clean array of active followers
        const validFollowers = [];
        for (let i = 0; i < this.scene.followers.length; i++) {
            const follower = this.scene.followers[i];
            if (follower && follower.active) {
                positions.push({ 
                    x: follower.x, 
                    y: follower.y, 
                    dir: follower.direction 
                });
                validFollowers.push(follower);
            }
        }
        
        // Update followers array with only active sprites
        this.scene.followers = validFollowers;
        
        // Calculate new player position
        let newX = player.x;
        let newY = player.y;
        
        switch (this.direction) {
            case 'left': newX -= TILE_SIZE; break;
            case 'right': newX += TILE_SIZE; break;
            case 'up': newY -= TILE_SIZE; break;
            case 'down': newY += TILE_SIZE; break;
        }
        
        const halfTile = TILE_SIZE / 2;
        
        // Check if the player would be outside the boundaries
        const wouldBeOutsideBoundary = 
            newX < halfTile || 
            newX > WORLD_WIDTH - halfTile || 
            newY < halfTile || 
            newY > WORLD_HEIGHT - halfTile;
        
        // Apply damage if hitting world boundary
        if (wouldBeOutsideBoundary && !this.boundaryCollisionCooldown) {
            const boundaryCollisionDamage = 5;
            player.damage(boundaryCollisionDamage);
            
            // Visual feedback
            this.scene.cameras.main.shake(100, 0.01);
            this.scene.cameras.main.flash(100, 128, 0, 0);
            
            // Prevent boundary damage spam
            this.boundaryCollisionCooldown = true;
            this.scene.time.delayedCall(1000, () => {
                this.boundaryCollisionCooldown = false;
            });
            
            console.log(`Player hit boundary, taking ${boundaryCollisionDamage} damage`);
        }
        
        // Apply player movement and enforce world boundaries
        player.x = newX;
        player.y = newY;
        player.x = Phaser.Math.Clamp(player.x, halfTile, WORLD_WIDTH - halfTile);
        player.y = Phaser.Math.Clamp(player.y, halfTile, WORLD_HEIGHT - halfTile);
        
        // Update player's direction property and angle
        player.direction = this.direction;
        player.setAngleFromDirection();
        
        // Move followers using the validated array
        for (let i = 0; i < this.scene.followers.length; i++) {
            const follower = this.scene.followers[i];
            const pos = positions[i];
            if (follower && follower.active) {
                follower.x = pos.x;
                follower.y = pos.y;
                follower.direction = pos.dir;
                follower.setAngleFromDirection();
            }
        }
        
        // Check for collisions with own body
        this.checkSelfCollision();
        
        // Apply queued direction change
        this.direction = this.nextDirection;
    }
    
    /**
     * Check if player has collided with any follower
     */
    checkSelfCollision() {
        const player = this.scene.player;
        
        for (let i = 0; i < this.scene.followers.length; i++) {
            const follower = this.scene.followers[i];
            if (player.x === follower.x && player.y === follower.y) {
                // Instead of instant game over, apply damage to the player
                const followerCollisionDamage = 5;
                player.damage(followerCollisionDamage);
                
                // Apply knockback by moving player in opposite direction
                switch (this.direction) {
                    case 'left': player.x += TILE_SIZE; break;
                    case 'right': player.x -= TILE_SIZE; break;
                    case 'up': player.y += TILE_SIZE; break;
                    case 'down': player.y -= TILE_SIZE; break;
                }
                
                // Visual feedback
                this.scene.cameras.main.shake(100, 0.01);
                
                // Prevent further collisions immediately
                this.collisionCooldown = true;
                this.scene.time.delayedCall(500, () => {
                    this.collisionCooldown = false;
                });
                
                console.log(`Player collided with follower, taking ${followerCollisionDamage} damage`);
                return;
            }
        }
    }
    
    /**
     * Increase snake movement speed
     * @param {number} amount - Amount to reduce delay by
     */
    increaseSpeed(amount = 5) {
        this.moveDelay = Math.max(70, this.moveDelay - amount);
    }
    
    /**
     * Reset movement properties
     */
    reset() {
        this.direction = 'right';
        this.nextDirection = 'right';
        this.moveTimer = 0;
        this.moveDelay = 150;
        this.effectiveMoveDelay = 150;
        this.lastEffectiveDelay = 150;
        this.collisionCooldown = false;
        this.boundaryCollisionCooldown = false;
    }
} 