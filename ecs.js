// Entity Component System for Snake Survivors
// This system allows for more modular game object management

import { TILE_SIZE } from './src/constants.js';

// Entity - just an ID with associated components
class Entity {
    constructor(id) {
        this.id = id;
        this.components = new Map();
        this.tags = new Set();
        this.manager = null; // Reference to the entity manager
    }

    // Add a component to this entity
    addComponent(component) {
        this.components.set(component.constructor.name, component);
        component.entity = this;
        return this;
    }

    // Remove a component by type
    removeComponent(componentType) {
        const name = typeof componentType === 'string' ? componentType : componentType.name;
        if (this.components.has(name)) {
            const component = this.components.get(name);
            component.entity = null;
            this.components.delete(name);
        }
        return this;
    }

    // Get a component by type
    getComponent(componentType) {
        const name = typeof componentType === 'string' ? componentType : componentType.name;
        return this.components.get(name);
    }

    // Check if entity has a component
    hasComponent(componentType) {
        const name = typeof componentType === 'string' ? componentType : componentType.name;
        return this.components.has(name);
    }

    // Add a tag to this entity
    addTag(tag) {
        this.tags.add(tag);
        // Update the entity manager's tag tracker if available
        if (this.manager) {
            this.manager.addEntityToTag(this, tag);
        }
        return this;
    }

    // Remove a tag
    removeTag(tag) {
        this.tags.delete(tag);
        // Update the entity manager's tag tracker if available
        if (this.manager) {
            this.manager.removeEntityFromTag(this, tag);
        }
        return this;
    }

    // Check if entity has a tag
    hasTag(tag) {
        return this.tags.has(tag);
    }
}

// Component - just data, no behavior
class Component {
    constructor() {
        this.entity = null;
    }
}

// Position Component
class PositionComponent extends Component {
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
}

// Sprite Component
class SpriteComponent extends Component {
    constructor(sprite) {
        super();
        this.sprite = sprite;
    }
}

// Health Component
class HealthComponent extends Component {
    constructor(health, maxHealth) {
        super();
        this.health = health;
        this.maxHealth = maxHealth;
        this.healthBar = null;
    }
}

// Movement Component
class MovementComponent extends Component {
    constructor(speed, direction) {
        super();
        this.speed = speed;
        this.direction = direction;
        this.nextDirection = direction;
    }
}

// Combat Component
class CombatComponent extends Component {
    constructor(damage, attackSpeed) {
        super();
        this.damage = damage;
        this.attackSpeed = attackSpeed;
        this.attackCooldown = 0;
    }
}

// AI Component
class AIComponent extends Component {
    constructor(type) {
        super();
        this.type = type; // 'follow', 'wander', etc.
        this.target = null;
    }
}

// Special Ability Component
class SpecialAbilityComponent extends Component {
    constructor(abilityFunction, cooldownMax) {
        super();
        this.abilityFunction = abilityFunction;
        this.cooldownMax = cooldownMax;
        this.cooldown = 0;
    }
}

// Experience Component
class ExperienceComponent extends Component {
    constructor(level = 1, experience = 0, nextLevelExp = 100) {
        super();
        this.level = level;
        this.experience = experience;
        this.nextLevelExp = nextLevelExp;
    }
}

// Entity Manager - handles creation and tracking of entities
class EntityManager {
    constructor() {
        this.entities = new Map();
        this.nextEntityId = 0;
        this.entityTags = new Map(); // Map of tag -> Set of entities
    }

    // Create a new entity
    createEntity() {
        const id = `entity_${this.nextEntityId++}`;
        const entity = new Entity(id);
        entity.manager = this; // Set reference to this manager
        this.entities.set(id, entity);
        return entity;
    }

    // Remove an entity by id
    removeEntity(entityId) {
        const entity = this.getEntity(entityId);
        if (entity) {
            // Remove from tag groups
            entity.tags.forEach(tag => {
                this.removeEntityFromTag(entity, tag);
            });
            
            // Clean up components
            entity.components.forEach(component => {
                component.entity = null;
            });
            
            // Remove the entity
            entity.manager = null;
            this.entities.delete(entityId);
        }
    }

    // Get an entity by id
    getEntity(entityId) {
        return this.entities.get(entityId);
    }

    // Get all entities with a specific tag
    getEntitiesWithTag(tag) {
        if (!this.entityTags.has(tag)) {
            this.entityTags.set(tag, new Set());
        }
        return Array.from(this.entityTags.get(tag));
    }

    // Get all entities with a specific component
    getEntitiesWithComponent(componentType) {
        const name = typeof componentType === 'string' ? componentType : componentType.name;
        return Array.from(this.entities.values()).filter(entity => entity.hasComponent(name));
    }

    // Add entity to tag group
    addEntityToTag(entity, tag) {
        if (!this.entityTags.has(tag)) {
            this.entityTags.set(tag, new Set());
        }
        this.entityTags.get(tag).add(entity);
    }

    // Remove entity from tag group
    removeEntityFromTag(entity, tag) {
        if (this.entityTags.has(tag)) {
            this.entityTags.get(tag).delete(entity);
        }
    }

    // Update all tracked entities
    update(delta) {
        // Systems would call their update methods here
    }
}

// Systems - process entities with specific components
class System {
    constructor(entityManager) {
        this.entityManager = entityManager;
    }

    // Override in child classes
    update(delta) {}
}

// Movement System
class MovementSystem extends System {
    update(delta) {
        const entities = this.entityManager.getEntitiesWithComponent(MovementComponent);
        
        entities.forEach(entity => {
            const movement = entity.getComponent(MovementComponent);
            const position = entity.getComponent(PositionComponent);
            const sprite = entity.getComponent(SpriteComponent);
            
            if (position && movement) {
                // Apply movement based on direction
                movement.direction = movement.nextDirection;
                
                switch (movement.direction) {
                    case 'up':
                        position.y -= TILE_SIZE;
                        break;
                    case 'down':
                        position.y += TILE_SIZE;
                        break;
                    case 'left':
                        position.x -= TILE_SIZE;
                        break;
                    case 'right':
                        position.x += TILE_SIZE;
                        break;
                }
                
                // Update sprite position if exists
                if (sprite && sprite.sprite) {
                    sprite.sprite.x = position.x;
                    sprite.sprite.y = position.y;
                }
            }
        });
    }
}

// Health System
class HealthSystem extends System {
    update(delta) {
        const entities = this.entityManager.getEntitiesWithComponent(HealthComponent);
        
        entities.forEach(entity => {
            const health = entity.getComponent(HealthComponent);
            
            if (health && health.healthBar) {
                // Update health bar visibility and position
                const sprite = entity.getComponent(SpriteComponent);
                if (sprite && sprite.sprite) {
                    this.updateHealthBar(health, sprite.sprite);
                }
                
                // Check for death
                if (health.health <= 0 && entity.hasTag('player')) {
                    // Handle player death (game over)
                    // Could emit an event here
                }
            }
        });
    }
    
    updateHealthBar(health, sprite) {
        if (!health.healthBar) return;
        
        const healthPercent = Math.max(0, health.health / health.maxHealth);
        health.healthBar.clear();
        
        // Background (red)
        health.healthBar.fillStyle(0xFF0000);
        health.healthBar.fillRect(sprite.x - TILE_SIZE/2, sprite.y - TILE_SIZE - 5, TILE_SIZE, 3);
        
        // Health (green)
        health.healthBar.fillStyle(0x00FF00);
        health.healthBar.fillRect(sprite.x - TILE_SIZE/2, sprite.y - TILE_SIZE - 5, TILE_SIZE * healthPercent, 3);
    }
}

// AI System
class AISystem extends System {
    update(delta) {
        const entities = this.entityManager.getEntitiesWithComponent(AIComponent);
        const players = this.entityManager.getEntitiesWithTag('player');
        
        if (players.length === 0) return; // No player to target
        
        const player = players[0];
        const playerPos = player.getComponent(PositionComponent);
        
        entities.forEach(entity => {
            const ai = entity.getComponent(AIComponent);
            const position = entity.getComponent(PositionComponent);
            const sprite = entity.getComponent(SpriteComponent);
            
            if (ai && position && sprite && sprite.sprite) {
                // Set player as target
                ai.target = player;
                
                if (!playerPos) return; // Skip if player position component is missing
                
                switch (ai.type) {
                    case 'follow':
                        // Move toward player
                        const angle = Phaser.Math.Angle.Between(
                            position.x, position.y, 
                            playerPos.x, playerPos.y
                        );
                        
                        const movement = entity.getComponent(MovementComponent);
                        if (movement && !entity.hasComponent('Frozen')) {
                            sprite.sprite.body.velocity.x = Math.cos(angle) * movement.speed;
                            sprite.sprite.body.velocity.y = Math.sin(angle) * movement.speed;
                            sprite.sprite.rotation = angle;
                        }
                        break;
                        
                    // Add other AI types as needed
                }
            }
        });
    }
}

// Combat System
class CombatSystem extends System {
    update(delta) {
        const entities = this.entityManager.getEntitiesWithComponent(CombatComponent);
        
        entities.forEach(entity => {
            const combat = entity.getComponent(CombatComponent);
            
            // Update cooldowns
            if (combat.attackCooldown > 0) {
                combat.attackCooldown -= delta;
            }
        });
    }
    
    performAttack(attacker, target) {
        const attackerCombat = attacker.getComponent(CombatComponent);
        const targetHealth = target.getComponent(HealthComponent);
        
        if (attackerCombat && targetHealth && attackerCombat.attackCooldown <= 0) {
            // Deal damage
            targetHealth.health -= attackerCombat.damage;
            
            // Reset cooldown
            attackerCombat.attackCooldown = attackerCombat.attackSpeed;
            
            return true;
        }
        
        return false;
    }
}

// Export all classes
export {
    Entity,
    Component,
    PositionComponent,
    SpriteComponent,
    HealthComponent,
    MovementComponent,
    CombatComponent,
    AIComponent,
    SpecialAbilityComponent,
    ExperienceComponent,
    EntityManager,
    System,
    MovementSystem,
    HealthSystem,
    AISystem,
    CombatSystem
}; 