// Collision System for Snake Survivors
// Handles all collision detection and resolution between game entities

import { System } from './ecs.js';

class CollisionSystem extends System {
    constructor(entityManager, scene) {
        super(entityManager);
        this.scene = scene;
        this.collisionHandlers = new Map();
        
        // Set up default collision handlers
        this.setupDefaultHandlers();
    }
    
    // Register a collision handler for specific entity types
    registerCollisionHandler(tag1, tag2, handler) {
        const key = this.getCollisionKey(tag1, tag2);
        this.collisionHandlers.set(key, handler);
    }
    
    // Get unique key for collision pair
    getCollisionKey(tag1, tag2) {
        // Sort tags to ensure consistent key regardless of order
        const tags = [tag1, tag2].sort();
        return `${tags[0]}_${tags[1]}`;
    }
    
    // Set up default collision handlers
    setupDefaultHandlers() {
        // Player - Enemy collision
        this.registerCollisionHandler('player', 'enemy', (playerEntity, enemyEntity) => {
            const enemySprite = enemyEntity.getComponent('SpriteComponent').sprite;
            
            // Check if this enemy has already dealt damage recently
            if (!enemySprite.hasDealtDamage) {
                const playerHealth = playerEntity.getComponent('HealthComponent');
                const enemyCombat = enemyEntity.getComponent('CombatComponent');
                
                // Deal damage to player
                playerHealth.health -= enemyCombat ? enemyCombat.damage : 1;
                
                // Set flag to prevent rapid damage
                enemySprite.hasDealtDamage = true;
                
                // Reset the flag after a delay
                this.scene.time.delayedCall(500, () => {
                    if (enemySprite.active) {
                        enemySprite.hasDealtDamage = false;
                    }
                });
                
                // Visual feedback
                playerEntity.getComponent('SpriteComponent').sprite.setTint(0xFF0000);
                this.scene.time.delayedCall(100, () => {
                    if (playerEntity.getComponent('SpriteComponent').sprite.active) {
                        playerEntity.getComponent('SpriteComponent').sprite.clearTint();
                    }
                });
                
                return true; // Collision handled
            }
            
            return false; // No collision action taken
        });
        
        // Player - Pickup collision
        this.registerCollisionHandler('player', 'pickup', (playerEntity, pickupEntity) => {
            const pickupSprite = pickupEntity.getComponent('SpriteComponent').sprite;
            
            // Different effects based on pickup tags
            if (pickupEntity.hasTag('health')) {
                // Heal player
                const playerHealth = playerEntity.getComponent('HealthComponent');
                playerHealth.health = Math.min(playerHealth.health + 10, playerHealth.maxHealth);
            } 
            else if (pickupEntity.hasTag('experience')) {
                // Add experience
                const playerExp = playerEntity.getComponent('ExperienceComponent');
                if (playerExp) {
                    playerExp.experience += 20;
                    
                    // Check for level up
                    if (playerExp.experience >= playerExp.nextLevelExp) {
                        this.handleLevelUp(playerEntity);
                    }
                }
            }
            else if (pickupEntity.hasTag('power')) {
                // Temporary power boost
                const playerCombat = playerEntity.getComponent('CombatComponent');
                if (playerCombat) {
                    const originalDamage = playerCombat.damage;
                    playerCombat.damage *= 2;
                    
                    // Reset after 10 seconds
                    this.scene.time.delayedCall(10000, () => {
                        if (playerCombat.entity) {
                            playerCombat.damage = originalDamage;
                        }
                    });
                }
            }
            
            // Create pickup effect
            this.createPickupEffect(pickupSprite.x, pickupSprite.y);
            
            // Remove the pickup entity
            this.entityManager.removeEntity(pickupEntity.id);
            
            return true; // Collision handled
        });
        
        // Projectile - Enemy collision
        this.registerCollisionHandler('projectile', 'enemy', (projectileEntity, enemyEntity) => {
            // Ensure projectile is from player, not another enemy
            if (!projectileEntity.hasTag('player')) return false;
            
            const enemyHealth = enemyEntity.getComponent('HealthComponent');
            const projectileCombat = projectileEntity.getComponent('CombatComponent');
            
            // Deal damage to enemy
            if (enemyHealth && projectileCombat) {
                enemyHealth.health -= projectileCombat.damage;
                
                // Create hit effect
                const projectileSprite = projectileEntity.getComponent('SpriteComponent').sprite;
                this.createHitEffect(projectileSprite.x, projectileSprite.y);
                
                // Check if enemy died
                if (enemyHealth.health <= 0) {
                    // Find player to give experience
                    const players = this.entityManager.getEntitiesWithTag('player');
                    if (players.length > 0) {
                        const player = players[0];
                        const playerExp = player.getComponent('ExperienceComponent');
                        
                        if (playerExp) {
                            // Add experience based on enemy type
                            let expAmount = 10;
                            if (enemyEntity.hasTag('tank')) expAmount = 20;
                            if (enemyEntity.hasTag('boss')) expAmount = 50;
                            
                            playerExp.experience += expAmount;
                            
                            // Check for level up
                            if (playerExp.experience >= playerExp.nextLevelExp) {
                                this.handleLevelUp(player);
                            }
                        }
                    }
                    
                    // Create death effect
                    const enemySprite = enemyEntity.getComponent('SpriteComponent').sprite;
                    this.createDeathEffect(enemySprite.x, enemySprite.y);
                    
                    // Remove the enemy entity
                    this.entityManager.removeEntity(enemyEntity.id);
                    
                    // Random chance to spawn pickup
                    if (Math.random() < 0.2) {
                        this.scene.events.emit('spawnPickup', enemySprite.x, enemySprite.y);
                    }
                }
            }
            
            // Remove the projectile (unless it's a penetrating type)
            if (!projectileEntity.hasTag('penetrating')) {
                this.entityManager.removeEntity(projectileEntity.id);
            }
            
            return true; // Collision handled
        });
    }
    
    // Handle level up logic
    handleLevelUp(playerEntity) {
        const playerExp = playerEntity.getComponent('ExperienceComponent');
        
        // Increase level
        playerExp.level++;
        
        // Reset experience and increase next level requirement
        playerExp.experience = 0;
        playerExp.nextLevelExp = Math.floor(playerExp.nextLevelExp * 1.2);
        
        // Increase player stats
        const playerHealth = playerEntity.getComponent('HealthComponent');
        if (playerHealth) {
            playerHealth.maxHealth += 5;
            playerHealth.health = playerHealth.maxHealth; // Full heal on level up
        }
        
        const playerCombat = playerEntity.getComponent('CombatComponent');
        if (playerCombat) {
            playerCombat.damage += 0.5;
        }
        
        const playerMovement = playerEntity.getComponent('MovementComponent');
        if (playerMovement) {
            // Snake gets faster each level, but not too fast
            const newDelay = Math.max(70, 150 - (playerExp.level * 5));
            this.scene.events.emit('updateMoveDelay', newDelay);
        }
        
        // Display level up text
        const levelUpText = this.scene.add.text(
            this.scene.sys.game.config.width / 2, 
            this.scene.sys.game.config.height / 2, 
            'LEVEL UP!', 
            {
                fontSize: '48px',
                fontFamily: 'Arial',
                fill: '#FFFF00',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);
        
        // Fade out
        this.scene.tweens.add({
            targets: levelUpText,
            alpha: 0,
            y: levelUpText.y - 50,
            duration: 1500,
            onComplete: () => levelUpText.destroy()
        });
        
        // Emit level up event
        this.scene.events.emit('playerLevelUp', playerExp.level);
    }
    
    // Create pickup effect
    createPickupEffect(x, y) {
        const particles = this.scene.add.particles('particle');
        
        const emitter = particles.createEmitter({
            x: x,
            y: y,
            speed: { min: 50, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 600,
            quantity: 20,
            tint: 0xFFFF00
        });
        
        // Self-destruct
        this.scene.time.delayedCall(600, () => {
            particles.destroy();
        });
    }
    
    // Create hit effect
    createHitEffect(x, y) {
        const particles = this.scene.add.particles('particle');
        
        const emitter = particles.createEmitter({
            x: x,
            y: y,
            speed: { min: 30, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: 300,
            quantity: 5,
            tint: 0xFFFFFF
        });
        
        // Self-destruct
        this.scene.time.delayedCall(300, () => {
            particles.destroy();
        });
    }
    
    // Create death effect
    createDeathEffect(x, y) {
        const particles = this.scene.add.particles('particle');
        
        const emitter = particles.createEmitter({
            x: x,
            y: y,
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 800,
            quantity: 30,
            tint: 0xFF0000
        });
        
        // Self-destruct
        this.scene.time.delayedCall(800, () => {
            particles.destroy();
        });
    }
    
    // Check all collisions for the frame
    update(delta) {
        // Get player, followers, enemies, projectiles, pickups
        const players = this.entityManager.getEntitiesWithTag('player');
        const enemies = this.entityManager.getEntitiesWithTag('enemy');
        const projectiles = this.entityManager.getEntitiesWithTag('projectile');
        const pickups = this.entityManager.getEntitiesWithTag('pickup');
        
        // Don't check if no player
        if (players.length === 0) return;
        
        const player = players[0];
        const playerSprite = player.getComponent('SpriteComponent').sprite;
        
        // Check player-enemy collisions
        enemies.forEach(enemy => {
            const enemySprite = enemy.getComponent('SpriteComponent').sprite;
            
            if (this.checkCollision(playerSprite, enemySprite)) {
                const key = this.getCollisionKey('player', 'enemy');
                const handler = this.collisionHandlers.get(key);
                
                if (handler) {
                    handler(player, enemy);
                }
            }
        });
        
        // Check player-pickup collisions
        pickups.forEach(pickup => {
            const pickupSprite = pickup.getComponent('SpriteComponent').sprite;
            
            if (this.checkCollision(playerSprite, pickupSprite)) {
                const key = this.getCollisionKey('player', 'pickup');
                const handler = this.collisionHandlers.get(key);
                
                if (handler) {
                    handler(player, pickup);
                }
            }
        });
        
        // Check projectile-enemy collisions
        projectiles.forEach(projectile => {
            const projectileSprite = projectile.getComponent('SpriteComponent').sprite;
            
            enemies.forEach(enemy => {
                const enemySprite = enemy.getComponent('SpriteComponent').sprite;
                
                if (this.checkCollision(projectileSprite, enemySprite)) {
                    const key = this.getCollisionKey('projectile', 'enemy');
                    const handler = this.collisionHandlers.get(key);
                    
                    if (handler) {
                        handler(projectile, enemy);
                    }
                }
            });
        });
        
        // Check for out-of-bounds projectiles
        const bounds = {
            x: 0,
            y: 0,
            width: this.scene.sys.game.config.width,
            height: this.scene.sys.game.config.height
        };
        
        projectiles.forEach(projectile => {
            const sprite = projectile.getComponent('SpriteComponent').sprite;
            
            if (sprite.x < bounds.x || sprite.x > bounds.width || 
                sprite.y < bounds.y || sprite.y > bounds.height) {
                this.entityManager.removeEntity(projectile.id);
            }
        });
    }
    
    // Check collision between two sprites
    checkCollision(sprite1, sprite2) {
        // Use Phaser's built-in overlap check
        return Phaser.Geom.Rectangle.Overlaps(
            sprite1.getBounds(),
            sprite2.getBounds()
        );
    }
}

export default CollisionSystem; 