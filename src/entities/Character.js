import { TILE_SIZE } from '../constants.js';

/**
 * Base Character class that all game characters will extend
 * Handles common functionality like health, damage, and health bars
 */
export default class Character extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, config = {}) {
        super(scene, x, y, texture);
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set up health properties
        this.health = config.health || 1;
        this.maxHealth = config.maxHealth || this.health;
        this.healthBar = null;
        
        // Movement properties
        this.direction = config.direction || 'right';
        this.speed = config.speed || 50;
        
        // Physics body setup
        if (config.bodySize) {
            this.body.setSize(
                config.bodySize.width || TILE_SIZE * 0.8, 
                config.bodySize.height || TILE_SIZE * 0.8
            );
        }
        
        // Visual setup
        if (config.tint) {
            this.setTint(config.tint);
        }
        
        // Create health bar on creation
        this.updateHealthBar();
        
        // Event for cleanup
        this.on('destroy', this.onDestroy, this);
    }
    
    /**
     * Apply damage to the character
     * @param {number} amount - Amount of damage to apply
     * @returns {boolean} - Whether the character died from this damage
     */
    damage(amount) {
        if (!this.active) return false;
        
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();
        
        // Enhanced damage text with scaling
        this.createDamageText(amount);
        
        // Determine if this is the player
        const isPlayer = this.constructor.name === 'Player';
        
        // Play appropriate damage sound
        if (this.scene.audioManager) {
            if (isPlayer) {
                this.scene.audioManager.playPlayerDamageSound();
            } else if (this.constructor.name === 'Enemy' && this.health <= 0) {
                this.scene.audioManager.playSFX('enemy_death');
            }
        }
        
        // Damage flash effect - more dramatic for player
        this.scene.tweens.add({
            targets: this,
            alpha: isPlayer ? 0.3 : 0.5,
            duration: 100,
            yoyo: true,
            repeat: isPlayer ? 1 : 0,
            onComplete: () => { if(this.active) this.setAlpha(1); }
        });
        
        // Create impact effect
        const impactScale = isPlayer ? 1.5 : 1.2;
        this.scene.tweens.add({
            targets: this,
            scaleX: this.scaleX * impactScale,
            scaleY: this.scaleY * impactScale,
            duration: 50,
            yoyo: true,
            ease: 'Sine.easeOut'
        });
        
        // For significant damage (> 20% of max health), add extra effects
        if (amount > this.maxHealth * 0.2) {
            // Create a flash circle at impact point
            const flash = this.scene.add.circle(
                this.x, 
                this.y, 
                this.width, 
                0xFF0000, 
                0.5
            );
            flash.setDepth(this.depth + 1);
            
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 1.5,
                duration: 150,
                onComplete: () => flash.destroy()
            });
        }
        
        // Check if died
        if (this.health <= 0) {
            this.die();
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle character death
     */
    die() {
        // Override in subclasses
        this.createDeathEffect();
        this.destroy();
    }
    
    /**
     * Create explosion effect at character position
     */
    createDeathEffect() {
        // Can be overridden in subclasses for specific effects
        const emitter = this.scene.add.particles(this.x, this.y, 'particle', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            lifespan: { min: 300, max: 500 },
            quantity: 15,
            tint: this.tintTopLeft || 0xFFFFFF,
            blendMode: 'ADD',
            emitting: false
        });
        
        if (emitter) {
            emitter.explode(15);
            this.scene.time.delayedCall(500, () => {
                if (emitter) emitter.destroy();
            });
        }
    }
    
    /**
     * Create floating damage text
     */
    createDamageText(amount) {
        // Determine if this damage is significant (> 20% of max health)
        const isSignificant = amount > this.maxHealth * 0.2;
        const isPlayer = this.constructor.name === 'Player';
        
        // Adjust text size and color based on damage significance and character type
        const fontSize = isSignificant ? '18px' : (isPlayer ? '16px' : '14px');
        const textColor = isSignificant ? '#FF0000' : (isPlayer ? '#FFFF00' : '#FFFFFF');
        
        // Create the damage text
        const damageText = this.scene.add.text(this.x, this.y - 15, amount.toString(), {
            fontSize: fontSize, 
            fontFamily: 'Arial', 
            fill: textColor,
            stroke: '#000000', 
            strokeThickness: 3,
            fontStyle: isSignificant ? 'bold' : 'normal'
        }).setOrigin(0.5).setDepth(this.depth + 2);
        
        // Add visual effects to the text
        const targetY = isSignificant ? damageText.y - 30 : damageText.y - 20;
        const duration = isSignificant ? 800 : 600;
        
        // Apply scale effect for significant damage
        if (isSignificant) {
            damageText.setScale(0.5);
            this.scene.tweens.add({
                targets: damageText,
                scale: 1.5,
                duration: 150,
                yoyo: true,
                onComplete: () => damageText.setScale(1)
            });
        }
        
        // Float and fade animation
        this.scene.tweens.add({
            targets: damageText,
            y: targetY,
            alpha: 0,
            duration: duration,
            ease: 'Power1',
            onComplete: () => damageText.destroy()
        });
    }
    
    /**
     * Update the health bar position and fill
     */
    updateHealthBar() {
        if (!this.active || this.health === undefined || this.maxHealth === undefined) return;
        
        // Create health bar if it doesn't exist
        if (!this.healthBar) {
            this.healthBar = this.scene.add.graphics();
            this.on('destroy', () => { 
                if (this.healthBar) this.healthBar.destroy(); 
            });
        }
        
        const healthBar = this.healthBar;
        healthBar.clear();
        
        const barWidth = TILE_SIZE * 0.8;
        const barHeight = 3;
        
        // Position the health bar above the character, adjusted for warrior sprite
        const yOffset = this.texture.key === 'warrior' ? TILE_SIZE * 0.7 : TILE_SIZE * 0.5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - yOffset - barHeight - 1;
        const healthRatio = Math.max(0, this.health / this.maxHealth);
        
        // Background
        healthBar.fillStyle(0x8B0000, 0.7);
        healthBar.fillRect(barX, barY, barWidth, barHeight);
        // Foreground
        if (healthRatio > 0) {
            healthBar.fillStyle(0x00FF00, 0.9);
            healthBar.fillRect(barX, barY, barWidth * healthRatio, barHeight);
        }
        healthBar.setDepth(this.depth + 1);
    }
    
    /**
     * Set angle based on direction string
     */
    setAngleFromDirection() {
        switch (this.direction) {
            case 'left': this.angle = 180; break;
            case 'right': this.angle = 0; break;
            case 'up': this.angle = -90; break;
            case 'down': this.angle = 90; break;
        }
    }
    
    /**
     * Clean up resources when destroyed
     */
    onDestroy() {
        if (this.healthBar) {
            this.healthBar.destroy();
            this.healthBar = null;
        }
    }
    
    /**
     * Update method called every frame
     * @param {number} time - Current time
     * @param {number} delta - Time since last update
     */
    update(time, delta) {
        // Update health bar position to follow character
        if (this.healthBar) {
            this.healthBar.x = this.x;
            this.healthBar.y = this.y - this.height * 0.7;
        }
        
        // Don't automatically update angle for sprite sheet animations
        if (this.texture.key !== 'warrior') {
            this.setAngleFromDirection();
        }
    }
} 