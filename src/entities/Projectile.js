import { TILE_SIZE } from '../constants.js';

/**
 * Projectile class for bullets, arrows, and other attacks
 */
export default class Projectile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Default properties
        this.damage = 1;
        this.speed = 300;
        this.lifespan = null; // Infinite by default
        this.type = texture;
        
        // Special properties
        this.isPiercing = false;
        this.isSniper = false;
        this.freezeEffect = false;
        this.hitEnemies = null; // For tracking enemies hit by piercing projectiles
        this.target = null; // For targeted projectiles
        
        // Set depth
        this.setDepth(5);
    }
    
    /**
     * Fire the projectile in a direction
     * @param {number} dirX - X direction component (normalized)
     * @param {number} dirY - Y direction component (normalized)
     */
    fire(dirX, dirY) {
        if (!this.active) return;
        
        // Set velocity based on direction and speed
        this.body.velocity.x = dirX * this.speed;
        this.body.velocity.y = dirY * this.speed;
        
        // Set rotation to match direction
        this.rotation = Math.atan2(dirY, dirX);
        
        return this;
    }
    
    /**
     * Update method called by physics group
     */
    update(time, delta) {
        if (!this.active) return;
        
        // Check if out of bounds
        if (this.isOutOfBounds()) {
            this.destroy();
            return;
        }
        
        // Update lifespan if set
        if (this.lifespan !== null) {
            this.lifespan -= delta;
            if (this.lifespan <= 0) {
                this.destroy();
                return;
            }
        }
    }
    
    /**
     * Check if the projectile is out of the world bounds
     */
    isOutOfBounds() {
        const buffer = 50;
        const bounds = this.scene.physics.world.bounds;
        
        return (
            this.x < bounds.x - buffer ||
            this.x > bounds.x + bounds.width + buffer ||
            this.y < bounds.y - buffer ||
            this.y > bounds.y + bounds.height + buffer
        );
    }
    
    /**
     * Configure the projectile as piercing (passes through multiple enemies)
     * @param {number} maxPierces - Maximum enemies to pierce
     */
    setPiercing(maxPierces = 3) {
        this.isPiercing = true;
        this.maxPierces = maxPierces;
        this.pierceCount = 0;
        this.hitEnemies = new Set();
        return this;
    }
    
    /**
     * Configure the projectile as a sniper shot (high damage, targeted)
     * @param {Phaser.GameObjects.Sprite} target - Target enemy
     */
    setSniper(target) {
        this.isSniper = true;
        this.target = target;
        return this;
    }
    
    /**
     * Set the projectile's damage value
     * @param {number} value - Damage value
     */
    setDamage(value) {
        this.damage = value;
        return this;
    }
    
    /**
     * Set the projectile's speed
     * @param {number} value - Speed value
     */
    setSpeed(value) {
        this.speed = value;
        
        // If the projectile is already moving, update its velocity
        if (this.body && (this.body.velocity.x !== 0 || this.body.velocity.y !== 0)) {
            const currentAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
            this.body.velocity.x = Math.cos(currentAngle) * value;
            this.body.velocity.y = Math.sin(currentAngle) * value;
        }
        
        return this;
    }
    
    /**
     * Set the projectile's lifespan
     * @param {number} value - Lifespan in ms
     */
    setLifespan(value) {
        this.lifespan = value;
        return this;
    }
    
    /**
     * Add a freeze effect to the projectile
     */
    addFreezeEffect() {
        this.freezeEffect = true;
        return this;
    }
    
    /**
     * Factory method to create a standard bullet
     */
    static createBullet(scene, x, y, dirX, dirY) {
        const bullet = new Projectile(scene, x, y, 'bullet');
        return bullet.fire(dirX, dirY);
    }
    
    /**
     * Factory method to create an arrow
     */
    static createArrow(scene, x, y, dirX, dirY) {
        const arrow = new Projectile(scene, x, y, 'arrow');
        arrow.setDamage(3);
        arrow.setSpeed(400); // Increased default speed
        arrow.setScale(1.2); // Make arrow slightly larger
        
        // Create particle trail with updated Phaser 3.60 syntax
        const particles = scene.add.particles(x, y, 'particle', {
            speed: 20, // Faster particles
            scale: { start: 0.3, end: 0 }, // Larger particles
            blendMode: 'ADD',
            lifespan: 200,
            tint: 0x00FF00,
            follow: arrow,
            quantity: 2, // More particles
            frequency: 20
        });
        
        arrow.on('destroy', () => {
            if (particles) {
                particles.stop();
                scene.time.delayedCall(200, () => {
                    if (particles) particles.destroy();
                });
            }
        });
        
        // Make sure to initialize the arrow velocity
        return arrow.fire(dirX, dirY);
    }
    
    /**
     * Factory method to create a frost bolt
     */
    static createFrostBolt(scene, x, y, dirX, dirY) {
        const bolt = new Projectile(scene, x, y, 'bullet');
        bolt.setTint(0x00FFFF);
        bolt.addFreezeEffect();
        
        // Create particle trail with updated Phaser 3.60 syntax
        const particles = scene.add.particles(x, y, 'particle', {
            speed: 20,
            scale: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            tint: 0x00FFFF,
            follow: bolt,
            quantity: 1,
            frequency: 10
        });
        
        bolt.on('destroy', () => {
            if (particles) {
                particles.stop();
                scene.time.delayedCall(300, () => {
                    if (particles) particles.destroy();
                });
            }
        });
        
        return bolt.fire(dirX, dirY);
    }
    
    /**
     * Factory method to create a piercing projectile
     */
    static createPiercingProjectile(scene, x, y, dirX, dirY, tint = 0xFFFF00) {
        const projectile = new Projectile(scene, x, y, 'bullet');
        projectile.setTint(tint);
        projectile.setPiercing(3);
        projectile.setDamage(2);
        
        // Create particle trail with updated Phaser 3.60 syntax
        const particles = scene.add.particles(x, y, 'particle', {
            speed: 15,
            scale: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            lifespan: 250,
            tint: tint,
            follow: projectile,
            quantity: 1,
            frequency: 10
        });
        
        projectile.on('destroy', () => {
            if (particles) {
                particles.stop();
                scene.time.delayedCall(250, () => {
                    if (particles) particles.destroy();
                });
            }
        });
        
        return projectile.fire(dirX, dirY);
    }
} 