// Entity Factory for Snake Survivors
// Makes it easy to create common game entities using the ECS

import {
    PositionComponent,
    SpriteComponent,
    HealthComponent,
    MovementComponent,
    CombatComponent,
    AIComponent,
    SpecialAbilityComponent,
    ExperienceComponent
} from './ecs.js';

import { TILE_SIZE } from './src/constants.js';
import Player from './src/entities/Player.js';

// Factory for creating game entities
class EntityFactory {
    constructor(scene, entityManager) {
        this.scene = scene;
        this.entityManager = entityManager;
    }

    // Create player entity
    createPlayer(x, y, heroClass) {
        // Create player using the dedicated Player class
        // This is the primary source of truth for player creation
        const player = new Player(this.scene, x, y, heroClass);
        
        // If using ECS, you could also create an entity wrapper
        if (this.entityManager) {
            const entity = this.entityManager.createEntity();
            
            // Add components
            entity.addComponent(new PositionComponent(x, y));
            entity.addComponent(new SpriteComponent(player));
            entity.addComponent(new HealthComponent(player.health, player.maxHealth));
            entity.addComponent(new MovementComponent(player.speed, player.direction));
            entity.addComponent(new CombatComponent(1, 500));
            
            // Add special ability based on hero class
            entity.addComponent(new SpecialAbilityComponent(
                heroClass.specialAttack,
                3000
            ));
            
            // Add experience component for leveling
            entity.addComponent(new ExperienceComponent());
            
            // Add player tag
            entity.addTag('player');
            
            // Store the entity reference on the player for ECS operations
            player.entityId = entity.id;
        }
        
        // Return the player instance
        return player;
    }
    
    // Create follower entity
    createFollower(x, y, engineerClass = null) {
        try {
            // Validate parameters
            if (isNaN(x) || isNaN(y)) {
                console.error("Invalid coordinates for follower:", x, y);
                // Use safe default values
                x = 400;
                y = 300;
            }
            
            const entity = this.entityManager.createEntity();
            
            // Create sprite
            let sprite;
            try {
                sprite = this.scene.physics.add.sprite(x, y, 'follower');
                
                // Apply tint if engineer class is provided
                if (engineerClass && engineerClass.color) {
                    sprite.setTint(engineerClass.color);
                }
            } catch (spriteError) {
                console.error("Error creating follower sprite:", spriteError);
                // Try to clean up the entity
                this.entityManager.removeEntity(entity.id);
                return null;
            }
            
            // Add components
            entity.addComponent(new PositionComponent(x, y));
            entity.addComponent(new SpriteComponent(sprite));
            entity.addComponent(new HealthComponent(20, 20)); // Followers have less health
            entity.addComponent(new MovementComponent(1, 'right')); // Same speed as player
            
            // Add follower tag
            entity.addTag('follower');
            
            // If this is an engineer, add special ability
            if (engineerClass) {
                // Make sure the special attack function exists
                if (typeof engineerClass.specialAttack === 'function') {
                    console.log(`Creating follower with ${engineerClass.name}, Range: ${engineerClass.range}, Damage: ${engineerClass.damage}`);
                    
                    // Store the range and damage for debugging
                    entity.engineerRange = engineerClass.range;
                    entity.engineerDamage = engineerClass.damage;
                    
                    // Add the special ability component
                    entity.addComponent(new SpecialAbilityComponent(
                        engineerClass.specialAttack,
                        engineerClass.cooldown || 5000 // Use CSV cooldown or default
                    ));
                } else {
                    console.warn("Engineer class missing valid specialAttack function:", engineerClass.name);
                    // Add a dummy function to avoid crashes
                    entity.addComponent(new SpecialAbilityComponent(
                        (scene, follower, enemies) => { 
                            console.log("Using fallback attack for", engineerClass.name);
                            return false; 
                        },
                        5000
                    ));
                }
                
                // Add engineer tag
                entity.addTag('engineer');
                
                // Store engineer class information
                entity.engineerClass = engineerClass;
            }
            
            // Create health bar
            try {
                const healthComponent = entity.getComponent(HealthComponent);
                if (healthComponent) {
                    healthComponent.healthBar = this.scene.add.graphics();
                }
            } catch (healthBarError) {
                console.error("Error creating follower health bar:", healthBarError);
                // Not critical, continue without health bar
            }
            
            return entity;
            
        } catch (error) {
            console.error("Fatal error in createFollower:", error);
            return null;
        }
    }
    
    // Create enemy entity
    createEnemy(x, y, type = 'basic') {
        const entity = this.entityManager.createEntity();
        
        // Create sprite
        const sprite = this.scene.physics.add.sprite(x, y, 'enemy');
        sprite.setCollideWorldBounds(true);
        
        // Set enemy properties based on type
        let health = 10;
        let speed = 50;
        let damage = 1;
        let color = 0xFF0000;
        
        switch (type) {
            case 'fast':
                speed = 80;
                health = 5;
                color = 0xFF8800;
                break;
            case 'tank':
                speed = 30;
                health = 30;
                damage = 2;
                color = 0x880000;
                sprite.setScale(1.3);
                break;
            case 'boss':
                speed = 40;
                health = 100;
                damage = 3;
                color = 0xFF00FF;
                sprite.setScale(2);
                break;
        }
        
        // Apply tint
        sprite.setTint(color);
        
        // Add components
        entity.addComponent(new PositionComponent(x, y));
        entity.addComponent(new SpriteComponent(sprite));
        entity.addComponent(new HealthComponent(health, health));
        entity.addComponent(new MovementComponent(speed, 'none')); // Speed is handled by AI
        entity.addComponent(new CombatComponent(damage, 500)); // Attack cooldown
        entity.addComponent(new AIComponent('follow')); // Basic enemy follows player
        
        // Add enemy tag and specific type tag
        entity.addTag('enemy');
        entity.addTag(type);
        
        // Create health bar
        const healthComponent = entity.getComponent(HealthComponent);
        healthComponent.healthBar = this.scene.add.graphics();
        
        return entity;
    }
    
    // Create pickup entity
    createPickup(x, y, type = 'health') {
        const entity = this.entityManager.createEntity();
        
        // Create sprite
        const sprite = this.scene.physics.add.sprite(x, y, 'pickup');
        
        // Set pickup properties based on type
        let color = 0xFFFF00; // Default yellow
        
        switch (type) {
            case 'health':
                color = 0x00FF00; // Green for health
                break;
            case 'experience':
                color = 0x00FFFF; // Cyan for experience
                break;
            case 'power':
                color = 0xFF0000; // Red for power boost
                break;
        }
        
        // Apply tint
        sprite.setTint(color);
        
        // Add components
        entity.addComponent(new PositionComponent(x, y));
        entity.addComponent(new SpriteComponent(sprite));
        
        // Add pickup tag and specific type tag
        entity.addTag('pickup');
        entity.addTag(type);
        
        // Add twinkle animation
        this.scene.tweens.add({
            targets: sprite,
            alpha: 0.7,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        return entity;
    }
    
    // Create projectile entity
    createProjectile(x, y, dirX, dirY, type = 'bullet', owner = 'player') {
        const entity = this.entityManager.createEntity();
        
        // Create sprite
        const sprite = this.scene.physics.add.sprite(x, y, type);
        
        // Set properties based on type
        let speed = 300;
        let damage = 1;
        let color = 0xFFFF00;
        
        switch (type) {
            case 'arrow':
                speed = 400;
                damage = 1;
                color = 0x00FF00;
                break;
            case 'fireball':
                speed = 250;
                damage = 3;
                color = 0xFF6600;
                sprite.setScale(1.5);
                break;
        }
        
        // Apply tint
        sprite.setTint(color);
        
        // Add components
        entity.addComponent(new PositionComponent(x, y));
        entity.addComponent(new SpriteComponent(sprite));
        entity.addComponent(new CombatComponent(damage, 0)); // Projectiles deal instant damage
        
        // Add movement component and set velocity
        const normalizedDirX = dirX / Math.sqrt(dirX * dirX + dirY * dirY);
        const normalizedDirY = dirY / Math.sqrt(dirX * dirX + dirY * dirY);
        entity.addComponent(new MovementComponent(speed, 'projectile'));
        
        // Set sprite velocity
        sprite.body.velocity.x = normalizedDirX * speed;
        sprite.body.velocity.y = normalizedDirY * speed;
        
        // Rotate sprite to face direction
        sprite.rotation = Math.atan2(normalizedDirY, normalizedDirX);
        
        // Add projectile tag and owner tag
        entity.addTag('projectile');
        entity.addTag(owner); // Who fired this projectile
        
        return entity;
    }
}

export default EntityFactory; 