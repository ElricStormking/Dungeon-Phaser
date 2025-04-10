import Character from './Character.js';
import { TILE_SIZE } from '../constants.js';
import Projectile from './Projectile.js';

/**
 * Player class representing the snake's head
 * Handles player movement, attacks, and hero class abilities
 */
export default class Player extends Character {
    constructor(scene, x, y, heroClass) {
        super(scene, x, y, 'player', {
            health: 50,
            maxHealth: 50,
            direction: 'right',
            tint: heroClass.color,
            bodySize: { width: TILE_SIZE * 0.8, height: TILE_SIZE * 0.8 }
        });
        
        // Hero class and abilities
        this.heroClass = heroClass;
        this.specialAttackCooldown = 0;
        this.specialAttackCooldownMax = 3000;
        this.basicAttackCooldownTimer = 0;
        
        // Invulnerability flag
        this.isInvulnerable = false;
        
        // Set depth and other properties
        this.setDepth(10);
    }
    
    /**
     * Set player invulnerable for a short time after taking damage
     * @param {number} duration - Duration of invulnerability in ms
     */
    setInvulnerable(duration = 1000) {
        if (this.isInvulnerable) return;
        
        this.isInvulnerable = true;
        
        // Enhanced visual effect for damage
        // 1. Create a red flash overlay
        const flashRect = this.scene.add.rectangle(
            this.x, 
            this.y, 
            this.width * 1.5, 
            this.height * 1.5, 
            0xff0000, 
            0.7
        ).setDepth(this.depth + 1);
        
        // Flash and remove the overlay
        this.scene.tweens.add({
            targets: flashRect,
            alpha: 0,
            duration: 200,
            onComplete: () => flashRect.destroy()
        });
        
        // 2. Create damage particles
        const emitter = this.scene.add.particles(this.x, this.y, 'particle', {
            speed: { min: 30, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: { min: 300, max: 500 },
            quantity: 10,
            tint: 0xff0000,
            emitting: false
        });
        
        emitter.explode(10);
        this.scene.time.delayedCall(500, () => {
            if (emitter && emitter.active) emitter.destroy();
        });
        
        // 3. Improved player flashing - more intense and longer lasting
        this.scene.tweens.add({
            targets: this,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 9, // Increased repeat count for longer flashing
            onComplete: () => {
                if (this.active) this.setAlpha(1);
            }
        });
        
        // 4. Camera shake effect
        this.scene.cameras.main.shake(200, 0.005);
        
        // Reset invulnerability after duration
        this.scene.time.delayedCall(duration, () => {
            if (this.active) this.isInvulnerable = false;
        });
    }
    
    /**
     * Use the player's special attack
     */
    useSpecialAttack(enemies, helpers) {
        if (this.specialAttackCooldown > 0) return false;
        
        const success = this.heroClass.specialAttack(this.scene, this, enemies, helpers);
        
        if (success) {
            // Play special attack sound
            if (this.scene.audioManager) {
                this.scene.audioManager.playAttackSound('special');
            }
            
            this.specialAttackCooldown = this.specialAttackCooldownMax;
            return true;
        }
        
        return false;
    }
    
    /**
     * Perform a basic attack in a direction
     * @param {Phaser.Math.Vector2|null} targetPosition - Position to attack toward (null for current direction)
     */
    performBasicAttack(targetPosition) {
        if (this.basicAttackCooldownTimer > 0) return false;
        
        let dx, dy, angle;
        
        if (targetPosition) {
            // Mouse-based targeting
            dx = targetPosition.x - this.x;
            dy = targetPosition.y - this.y;
            angle = Math.atan2(dy, dx);
        } else {
            // Direction-based targeting
            switch(this.direction) {
                case 'right': dx = 1; dy = 0; break;
                case 'left':  dx = -1; dy = 0; break;
                case 'up':    dx = 0; dy = -1; break;
                case 'down':  dx = 0; dy = 1; break;
                default:      dx = 1; dy = 0;
            }
            angle = Math.atan2(dy, dx);
        }
        
        // Normalize direction
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / magnitude;
        const normalizedDy = dy / magnitude;
        
        // Dispatch to hero-specific attack
        let success = false;
        let attackType = '';
        
        switch (this.heroClass.key) {
            case 'warrior': 
                attackType = 'melee';
                success = this.performWarriorAttack(angle, this.scene.enemies); 
                break;
            case 'archer': 
                attackType = 'ranged';
                success = this.performArcherAttack(normalizedDx, normalizedDy); 
                break;
            case 'mage': 
                attackType = 'magic';
                success = this.performMageAttack(normalizedDx, normalizedDy); 
                break;
            default:
                console.warn('Unknown hero class for basic attack:', this.heroClass.key);
        }
        
        if (success) {
            // Play attack sound
            if (this.scene.audioManager) {
                this.scene.audioManager.playAttackSound(attackType);
            }
            
            // Set cooldown
            const baseCooldown = 500;
            const cooldownReduction = Math.min(0.5, this.scene.currentLevel * 0.03);
            this.basicAttackCooldownTimer = baseCooldown * (1 - cooldownReduction);
        }
        
        return success;
    }
    
    /**
     * Warrior-specific basic attack (sword sweep)
     */
    performWarriorAttack(angle, enemies) {
        const distance = TILE_SIZE * 2.5; // Range
        const arc = 1.2; // Radians (about 70 degrees)
        
        // Create sword sprite instead of basic graphics
        const sword = this.scene.add.sprite(this.x, this.y, 'bullet');
        sword.setTint(0xFFFFFF);
        sword.setAlpha(0.8);
        sword.setScale(3, 0.5); // Long and thin like a sword
        sword.setOrigin(0, 0.5); // Set origin to left-center for rotation
        sword.setDepth(this.depth + 1);
        
        // Set initial angle
        sword.rotation = angle - arc/2;
        
        // Add swing animation
        this.scene.tweens.add({
            targets: sword,
            rotation: angle + arc/2,
            duration: 150,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                // Add particles along the sword edge for trail effect
                const tipX = sword.x + Math.cos(sword.rotation) * distance;
                const tipY = sword.y + Math.sin(sword.rotation) * distance;
                
                try {
                    // Add particle at tip of sword
                    const particles = this.scene.add.particles(tipX, tipY, 'particle', {
                        lifespan: 200,
                        scale: { start: 0.4, end: 0 },
                        quantity: 1,
                        alpha: { start: 0.5, end: 0 },
                        tint: 0xFFFFFF
                    });
                    
                    // Clean up particles
                    this.scene.time.delayedCall(200, () => {
                        if (particles) particles.destroy();
                    });
                } catch (e) {
                    // Continue even if particles can't be created
                }
            },
            onComplete: () => sword.destroy()
        });
        
        // Damage check (same as before)
        const attackBounds = new Phaser.Geom.Polygon([
            this.x, this.y,
            this.x + Math.cos(angle - arc/2) * distance, 
            this.y + Math.sin(angle - arc/2) * distance,
            this.x + Math.cos(angle + arc/2) * distance, 
            this.y + Math.sin(angle + arc/2) * distance
        ]);
        
        let hitCount = 0;
        
        enemies.children.each(enemy => {
            if (!enemy.active) return;
            if (Phaser.Geom.Intersects.RectangleToPolygon(enemy.getBounds(), attackBounds)) {
                enemy.damage(2);
                
                // Knockback
                const knockbackAngle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
                if (enemy.body) {
                    enemy.body.velocity.x += Math.cos(knockbackAngle) * 100;
                    enemy.body.velocity.y += Math.sin(knockbackAngle) * 100;
                    this.scene.tweens.add({ 
                        targets: enemy.body.velocity, 
                        x: '*=0.5', 
                        y: '*=0.5', 
                        duration: 200
                    });
                }
                
                // Add hit effect
                const hitEffect = this.scene.add.sprite(enemy.x, enemy.y, 'bullet');
                hitEffect.setTint(0xFFFF00);
                hitEffect.setAlpha(0.7);
                hitEffect.setScale(1);
                this.scene.tweens.add({
                    targets: hitEffect,
                    alpha: 0,
                    scale: 1.5,
                    duration: 150,
                    onComplete: () => hitEffect.destroy()
                });
                
                hitCount++;
            }
        });
        
        return hitCount > 0;
    }
    
    /**
     * Archer-specific basic attack (arrow)
     */
    performArcherAttack(dx, dy) {
        // Get reference to scene
        const scene = this.scene;
        
        // Check if we can shoot
        if (!scene.bullets) return false;
        
        // Create arrow sprite directly using the image API first
        // This ensures the sprite exists even if texture isn't fully ready
        const arrow = scene.add.sprite(this.x, this.y, 'arrow');
        arrow.setScale(1.2);
        
        // AFTER creating the sprite, add physics
        scene.physics.world.enable(arrow);
        scene.bullets.add(arrow);
        
        // Critical properties for collision detection
        arrow.damage = 3;
        arrow.isEnemyProjectile = false; // Ensure it's recognized as a player projectile
        arrow.setData('type', 'arrow'); // Add a type for potential filtering
        
        // Set size for better collision detection
        arrow.body.setSize(16, 4);  // Adjust size to match arrow shape
        
        // Set rotation first before velocity
        arrow.rotation = Math.atan2(dy, dx);
        
        // Set velocity directly with higher speed to ensure movement
        const speed = 500;
        arrow.body.velocity.x = dx * speed;
        arrow.body.velocity.y = dy * speed;
        
        // Use a simpler visual effect first to ensure it works
        arrow.setTint(0x00FF00);
        
        // Add a simple delayed cleanup instead of relying on bounds checking
        scene.time.delayedCall(2000, () => {
            if (arrow && arrow.active) {
                arrow.destroy();
            }
        });
        
        // Only add particle effects if the arrow is successfully moving
        scene.time.delayedCall(100, () => {
            if (arrow && arrow.active && (arrow.body.velocity.x !== 0 || arrow.body.velocity.y !== 0)) {
                try {
                    // Use simpler particle configuration
                    const emitter = scene.add.particles('particle').createEmitter({
                        follow: arrow,
                        scale: { start: 0.2, end: 0 },
                        alpha: { start: 0.6, end: 0 },
                        speed: 10,
                        lifespan: 200,
                        quantity: 1,
                        frequency: 30,
                        tint: 0x00FF00
                    });
                    
                    arrow.emitter = emitter;
                    
                    // Clean up emitter when arrow is destroyed
                    arrow.on('destroy', () => {
                        if (emitter) {
                            emitter.stop();
                            scene.time.delayedCall(200, () => {
                                if (emitter && emitter.manager) {
                                    emitter.manager.destroy();
                                }
                            });
                        }
                    });
                } catch (e) {
                    console.warn("Particle effect could not be created", e);
                    // Arrow will still work without particles
                }
            }
        });
        
        console.log("Archer arrow created and added to bullets group:", 
                   arrow, "Bullets group size:", scene.bullets.getLength());
        
        return true;
    }
    
    /**
     * Mage-specific basic attack (frost bolt)
     */
    performMageAttack(dx, dy) {
        // Get reference to scene
        const scene = this.scene;
        
        // Check if we can shoot
        if (!scene.bullets) return false;
        
        // Create frost bolt sprite directly
        const bolt = new Phaser.Physics.Arcade.Sprite(scene, this.x, this.y, 'bullet');
        scene.add.existing(bolt);
        scene.physics.add.existing(bolt);
        scene.bullets.add(bolt);
        
        // Set bolt properties
        bolt.setTint(0x00FFFF);
        bolt.damage = 1;
        bolt.freezeEffect = true;
        
        // Set velocity directly
        const speed = 350;
        bolt.body.velocity.x = dx * speed;
        bolt.body.velocity.y = dy * speed;
        bolt.rotation = Math.atan2(dy, dx);
        
        // Add particle trail using older emitter syntax that's more reliable
        const emitter = scene.add.particles('particle').createEmitter({
            speed: 20,
            scale: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            tint: 0x00FFFF,
            follow: bolt,
            quantity: 2,
            frequency: 20
        });
        
        // Make sure emitter is cleaned up properly
        bolt.on('destroy', () => {
            emitter.stop();
            scene.time.delayedCall(300, () => {
                if (emitter && !emitter.destroyed) {
                    emitter.manager.destroy();
                }
            });
        });
        
        // Set up out-of-bounds check
        scene.time.addEvent({
            delay: 100,
            callback: () => {
                if (!bolt.active) return;
                
                const bounds = scene.physics.world.bounds;
                const buffer = 50;
                
                if (bolt.x < bounds.x - buffer ||
                    bolt.x > bounds.x + bounds.width + buffer ||
                    bolt.y < bounds.y - buffer ||
                    bolt.y > bounds.y + bounds.height + buffer) {
                    bolt.destroy();
                }
            },
            loop: true
        });
        
        return true;
    }
    
    /**
     * Override die method to handle game over
     */
    die() {
        if (this.scene.gameOver) return;
        
        this.createDeathEffect();
        this.scene.handleGameOver();
    }
    
    /**
     * Update cooldowns and other time-based properties
     */
    update(time, delta) {
        super.update(time, delta);
        
        // Update cooldowns
        if (this.specialAttackCooldown > 0) {
            this.specialAttackCooldown = Math.max(0, this.specialAttackCooldown - delta);
        }
        
        if (this.basicAttackCooldownTimer > 0) {
            this.basicAttackCooldownTimer = Math.max(0, this.basicAttackCooldownTimer - delta);
        }
    }
} 