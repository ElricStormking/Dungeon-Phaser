// Game Scene using the Entity Component System
import { EntityManager } from './ecs.js';
import EntityFactory from './entity-factory.js';
import CollisionSystem from './collision-system.js';
import { MovementSystem, HealthSystem, AISystem } from './ecs.js';
import ClassLoader from './class-loader.js';

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const TILE_SIZE = 16;

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Game state variables
        this.moveDelay = 150; // Time between snake moves in ms
        this.moveTimer = 0;
        this.score = 0;
        this.gameOver = false;
        this.specialAttackCooldownMax = 3000; // ms
        this.experienceToNextLevel = 100;
        
        // Track engineers separately
        this.engineers = [];
        
        // Class loader for engineer and commander classes
        this.classLoader = new ClassLoader(this);
        
        // Engineer classes (will be populated from CSV)
        this.engineerClasses = {};
        
        // Fallback engineer class in case loading fails
        this.fallbackEngineerClass = {
            chronotemporal: {
                name: 'Chronotemporal',
                color: 0xC78FFF, // Purple
                ability: 'Timeburst',
                description: 'Slows nearby enemies temporarily',
                specialAttack: (scene, follower, enemies) => {
                    // Find enemies in range
                    const range = TILE_SIZE * 4;
                    let affected = 0;
                    
                    const followerPos = follower.getComponent('PositionComponent');
                    if (!followerPos) return false;
                    
                    enemies.forEach(enemy => {
                        const enemyPos = enemy.getComponent('PositionComponent');
                        const enemySprite = enemy.getComponent('SpriteComponent');
                        
                        if (!enemyPos || !enemySprite || !enemySprite.sprite) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            followerPos.x, followerPos.y, 
                            enemyPos.x, enemyPos.y
                        );
                        
                        if (distance <= range) {
                            // Slow down enemy
                            if (!enemy.hasTag('frozen')) {
                                // Visual effect
                                enemySprite.sprite.setTint(0xAA88FF);
                                enemy.addTag('frozen');
                                
                                // Store original speed
                                const movement = enemy.getComponent('MovementComponent');
                                if (movement) {
                                    enemy.originalSpeed = movement.speed;
                                    movement.speed = movement.speed * 0.3; // Slow by 70%
                                }
                                
                                // Create slow effect
                                const slowEffect = scene.add.particles('particle');
                                const emitter = slowEffect.createEmitter({
                                    x: enemyPos.x,
                                    y: enemyPos.y,
                                    speed: { min: 20, max: 40 },
                                    scale: { start: 0.4, end: 0 },
                                    lifespan: 1000,
                                    quantity: 1,
                                    frequency: 100,
                                    tint: 0xAA88FF
                                });
                                
                                // Restore speed after delay
                                scene.time.delayedCall(2000, () => {
                                    if (enemy.active) {
                                        if (enemySprite.sprite && enemySprite.sprite.active) {
                                            enemySprite.sprite.clearTint();
                                        }
                                        enemy.removeTag('frozen');
                                        
                                        if (movement && enemy.originalSpeed) {
                                            movement.speed = enemy.originalSpeed;
                                        }
                                    }
                                    emitter.stop();
                                    scene.time.delayedCall(1000, () => {
                                        slowEffect.destroy();
                                    });
                                });
                                
                                affected++;
                            }
                        }
                    });
                    
                    // Visual effect for time burst
                    if (affected > 0) {
                        const timeEffect = scene.add.graphics();
                        timeEffect.fillStyle(0xAA88FF, 0.3);
                        timeEffect.fillCircle(followerPos.x, followerPos.y, range);
                        
                        scene.tweens.add({
                            targets: timeEffect,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => timeEffect.destroy()
                        });
                    }
                    
                    return affected > 0;
                }
            },
            voltaic: {
                name: 'Voltaic',
                color: 0x00FFFF, // Cyan
                ability: 'Chain Lightning',
                description: 'Electric attacks that chain to nearby enemies',
                specialAttack: (scene, follower, enemies) => {
                    // Early returns if no enemies or follower position is invalid
                    if (!enemies || enemies.length === 0) return false;
                    
                    const followerPos = follower.getComponent('PositionComponent');
                    if (!followerPos) return false;
                    
                    // Find closest enemy to attack first
                    let closestEnemy = null;
                    let closestDistance = Number.MAX_VALUE;
                    
                    enemies.forEach(enemy => {
                        // Skip if enemy doesn't have required components
                        const enemyPos = enemy.getComponent('PositionComponent');
                        if (!enemyPos) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            followerPos.x, followerPos.y,
                            enemyPos.x, enemyPos.y
                        );
                        
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestEnemy = enemy;
                        }
                    });
                    
                    // No valid enemies found or all are too far away
                    if (!closestEnemy || closestDistance > TILE_SIZE * 8) return false;
                    
                    // Begin chain lightning
                    const hitEnemies = new Set();
                    const lightningLines = [];
                    const maxChains = 3;
                    
                    // Create lightning from follower to first enemy
                    const closestEnemyPos = closestEnemy.getComponent('PositionComponent');
                    if (!closestEnemyPos) return false; // Safety check
                    
                    lightningLines.push({
                        x1: followerPos.x,
                        y1: followerPos.y,
                        x2: closestEnemyPos.x,
                        y2: closestEnemyPos.y
                    });
                    
                    // Damage first enemy
                    hitEnemies.add(closestEnemy.id);
                    const healthComp = closestEnemy.getComponent('HealthComponent');
                    if (healthComp) {
                        healthComp.health -= 2;
                    }
                    
                    // Chain to nearby enemies
                    let currentEnemy = closestEnemy;
                    let chainCount = 1;
                    
                    while (chainCount < maxChains) {
                        // Find next closest enemy not already hit
                        let nextEnemy = null;
                        let nextDistance = Number.MAX_VALUE;
                        const currentPos = currentEnemy.getComponent('PositionComponent');
                        
                        if (!currentPos) break; // Safety check
                        
                        enemies.forEach(enemy => {
                            if (hitEnemies.has(enemy.id)) return;
                            
                            const enemyPos = enemy.getComponent('PositionComponent');
                            if (!enemyPos) return;
                            
                            const distance = Phaser.Math.Distance.Between(
                                currentPos.x, currentPos.y,
                                enemyPos.x, enemyPos.y
                            );
                            
                            if (distance < nextDistance && distance < TILE_SIZE * 5) {
                                nextDistance = distance;
                                nextEnemy = enemy;
                            }
                        });
                        
                        if (!nextEnemy) break;
                        
                        // Add lightning chain
                        const nextPos = nextEnemy.getComponent('PositionComponent');
                        if (!nextPos) break; // Safety check
                        
                        lightningLines.push({
                            x1: currentPos.x,
                            y1: currentPos.y,
                            x2: nextPos.x,
                            y2: nextPos.y
                        });
                        
                        // Damage next enemy
                        hitEnemies.add(nextEnemy.id);
                        const nextHealthComp = nextEnemy.getComponent('HealthComponent');
                        if (nextHealthComp) {
                            nextHealthComp.health -= 2;
                        }
                        
                        // Move to next chain
                        currentEnemy = nextEnemy;
                        chainCount++;
                    }
                    
                    // Create lightning visuals
                    try {
                        for (const line of lightningLines) {
                            const lightning = scene.add.graphics();
                            lightning.lineStyle(2, 0x00FFFF, 1);
                            lightning.beginPath();
                            lightning.moveTo(line.x1, line.y1);
                            
                            // Create zigzag lightning effect
                            const segments = 3;
                            const dx = (line.x2 - line.x1) / segments;
                            const dy = (line.y2 - line.y1) / segments;
                            
                            for (let i = 1; i < segments; i++) {
                                const x = line.x1 + dx * i;
                                const y = line.y1 + dy * i;
                                const offset = (Math.random() - 0.5) * 10;
                                lightning.lineTo(x + offset, y + offset);
                            }
                            
                            lightning.lineTo(line.x2, line.y2);
                            lightning.strokePath();
                            
                            // Fade out
                            scene.tweens.add({
                                targets: lightning,
                                alpha: 0,
                                duration: 200,
                                onComplete: () => lightning.destroy()
                            });
                        }
                    } catch (error) {
                        console.error('Error creating lightning effect:', error);
                        // Don't let visual error crash the game
                    }
                    
                    return hitEnemies.size > 0;
                }
            },
            pyrokinetic: {
                name: 'Pyrokinetic',
                color: 0xFF4500, // Red-orange
                ability: 'Flame Burst',
                description: 'Creates explosive flames',
                specialAttack: (scene, follower, enemies) => {
                    if (enemies.length === 0) return false;
                    
                    const followerPos = follower.getComponent('PositionComponent');
                    if (!followerPos) return false;
                    
                    // Create flame explosion
                    const explosionRadius = TILE_SIZE * 3;
                    let enemiesHit = 0;
                    
                    // Visual effect for explosion
                    const explosion = scene.add.graphics();
                    explosion.fillStyle(0xFF4500, 0.6);
                    explosion.fillCircle(followerPos.x, followerPos.y, explosionRadius);
                    
                    // Add particles
                    const particles = scene.add.particles('particle');
                    const emitter = particles.createEmitter({
                        x: followerPos.x,
                        y: followerPos.y,
                        speed: { min: 50, max: 150 },
                        angle: { min: 0, max: 360 },
                        scale: { start: 1, end: 0 },
                        lifespan: 500,
                        quantity: 40,
                        tint: [0xFF4500, 0xFF0000, 0xFFFF00]
                    });
                    
                    emitter.explode();
                    
                    // Damage enemies in radius
                    enemies.forEach(enemy => {
                        const enemyPos = enemy.getComponent('PositionComponent');
                        if (!enemyPos) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            followerPos.x, followerPos.y,
                            enemyPos.x, enemyPos.y
                        );
                        
                        if (distance <= explosionRadius) {
                            // Damage enemy
                            const healthComp = enemy.getComponent('HealthComponent');
                            if (healthComp) {
                                // More damage closer to center
                                const damageMultiplier = 1 - (distance / explosionRadius);
                                const damage = Math.max(1, Math.floor(5 * damageMultiplier));
                                healthComp.health -= damage;
                                
                                // Create hit text
                                const hitText = scene.add.text(
                                    enemyPos.x, 
                                    enemyPos.y - 20, 
                                    damage.toString(), 
                                    {
                                        fontSize: '16px',
                                        fontFamily: 'Arial',
                                        fill: '#FF0000'
                                    }
                                ).setOrigin(0.5);
                                
                                // Fade out
                                scene.tweens.add({
                                    targets: hitText,
                                    y: hitText.y - 30,
                                    alpha: 0,
                                    duration: 800,
                                    onComplete: () => hitText.destroy()
                                });
                                
                                enemiesHit++;
                            }
                        }
                    });
                    
                    // Fade out explosion
                    scene.tweens.add({
                        targets: explosion,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => explosion.destroy()
                    });
                    
                    // Destroy particles
                    scene.time.delayedCall(500, () => {
                        particles.destroy();
                    });
                    
                    return enemiesHit > 0;
                }
            },
            darkMage: {
                name: 'Dark Mage',
                color: 0x4B0082, // Indigo (dark blue)
                ability: 'Aether Beam',
                description: 'Fires a powerful beam of dark energy',
                specialAttack: (scene, follower, enemies) => {
                    // Ultra-simplified attack to avoid any potential crash points
                    if (!enemies || enemies.length === 0) return false;
                    
                    const followerPos = follower.getComponent('PositionComponent');
                    if (!followerPos) return false;
                    
                    // Skip all the complex targeting and just damage the first enemy in the array
                    let didDamage = false;
                    
                    try {
                        // Find a valid enemy
                        for (let i = 0; i < enemies.length; i++) {
                            const enemy = enemies[i];
                            if (!enemy) continue;
                            
                            const enemyPos = enemy.getComponent('PositionComponent');
                            if (!enemyPos) continue;
                            
                            const healthComp = enemy.getComponent('HealthComponent');
                            if (!healthComp) continue;
                            
                            // Apply damage without any complex visuals
                            healthComp.health -= 5;
                            didDamage = true;
                            
                            // Create a simplified version of explosion effect directly
                            try {
                                // Instead of using the scene method, create simple particle effect directly
                                if (scene.add && scene.add.particles) {
                                    const particles = scene.add.particles('particle');
                                    const emitter = particles.createEmitter({
                                        x: enemyPos.x,
                                        y: enemyPos.y,
                                        speed: { min: 50, max: 100 },
                                        scale: { start: 0.8, end: 0 },
                                        lifespan: 300,
                                        quantity: 10,
                                        tint: 0x4B0082
                                    });
                                    
                                    // Explode particles
                                    emitter.explode();
                                    
                                    // Self-destruct
                                    scene.time.delayedCall(300, () => {
                                        if (particles.active) {
                                            particles.destroy();
                                        }
                                    });
                                }
                            } catch (particleError) {
                                console.error("Failed to create dark mage particles:", particleError);
                                // Continue without visual effects
                            }
                            
                            break; // Just attack one enemy then stop
                        }
                    } catch (error) {
                        console.error('Error in simplified Dark Mage attack:', error);
                        return false;
                    }
                    
                    return didDamage;
                }
            }
        };
        
        // Hero classes
        this.heroClasses = {
            warrior: {
                name: 'Warrior',
                color: 0x00FFFF,
                specialAttack: (scene, entity) => {
                    // Sword sweep (damages all nearby enemies)
                    const range = TILE_SIZE * 3;
                    const position = entity.getComponent('PositionComponent');
                    let enemiesHit = 0;
                    
                    const enemies = this.entityManager.getEntitiesWithTag('enemy');
                    
                    enemies.forEach(enemy => {
                        const enemyPos = enemy.getComponent('PositionComponent');
                        
                        const distance = Phaser.Math.Distance.Between(
                            position.x, position.y, 
                            enemyPos.x, enemyPos.y
                        );
                        
                        if (distance <= range) {
                            // Create explosion effect
                            this.createExplosion(enemyPos.x, enemyPos.y, 0xFFFF00);
                            
                            // Remove enemy
                            this.entityManager.removeEntity(enemy.id);
                            
                            // Increase score
                            this.score += 5;
                            this.scoreText.setText('Score: ' + this.score);
                            
                            enemiesHit++;
                        }
                    });
                    
                    // Visual effect for sword sweep
                    const sweep = this.add.graphics();
                    sweep.fillStyle(0xFFFF00, 0.3);
                    sweep.fillCircle(position.x, position.y, range);
                    
                    // Fade out and destroy
                    this.tweens.add({
                        targets: sweep,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            sweep.destroy();
                        }
                    });
                    
                    return enemiesHit > 0;
                }
            },
            archer: {
                name: 'Archer',
                color: 0x00FF00,
                specialAttack: (scene, entity) => {
                    // Fire arrows in 8 directions
                    const directions = [
                        {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
                        {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
                    ];
                    
                    const position = entity.getComponent('PositionComponent');
                    
                    directions.forEach(dir => {
                        this.entityFactory.createProjectile(
                            position.x, position.y, 
                            dir.x, dir.y, 
                            'arrow', 'player'
                        );
                    });
                    
                    return true;
                }
            },
            mage: {
                name: 'Mage',
                color: 0xFF00FF,
                specialAttack: (scene, entity) => {
                    // Freeze all enemies temporarily
                    const enemies = this.entityManager.getEntitiesWithTag('enemy');
                    
                    if (enemies.length === 0) return false;
                    
                    enemies.forEach(enemy => {
                        const sprite = enemy.getComponent('SpriteComponent').sprite;
                        
                        // Visual effect
                        sprite.setTint(0x00FFFF);
                        
                        // Add frozen component/tag
                        enemy.addTag('frozen');
                        
                        // Store original movement
                        const movement = enemy.getComponent('MovementComponent');
                        if (movement) {
                            enemy.originalSpeed = movement.speed;
                            movement.speed = 0;
                        }
                        
                        // Stop sprite movement
                        sprite.body.velocity.x = 0;
                        sprite.body.velocity.y = 0;
                        
                        // Unfreeze after a delay
                        this.time.delayedCall(2000, () => {
                            if (enemy.active) {
                                sprite.clearTint();
                                enemy.removeTag('frozen');
                                
                                // Restore movement
                                if (movement && enemy.originalSpeed) {
                                    movement.speed = enemy.originalSpeed;
                                }
                            }
                        });
                    });
                    
                    return true;
                }
            }
        };
    }
    
    init(data) {
        // Initialize scene with data from title scene
        this.selectedHero = data.selectedHero || 'warrior';
        this.currentHeroClass = this.heroClasses[this.selectedHero];
    }
    
    preload() {
        // Preload all assets
        this.load.image('player', 'assets/player.png');
        this.load.image('follower', 'assets/follower.png');
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('pickup', 'assets/pickup.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('particle', 'assets/particle.png');
        
        // Preload CSV files for class stats
        this.classLoader.preload();
    }
    
    create() {
        // Load class data from CSV files
        this.classLoader.load();
        
        // Set up engineer classes after loading
        this.setupEngineerClasses();
        
        // Update hero classes with CSV data if available
        this.updateHeroClasses();
        
        // Reset game state
        this.gameOver = false;
        this.score = 0;
        this.moveTimer = 0;
        this.engineers = [];
        
        // Create input handlers
        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.cursors.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.cursors.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.cursors.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.specialAttackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Create entity manager
        this.entityManager = new EntityManager();
        
        // Create entity factory
        this.entityFactory = new EntityFactory(this, this.entityManager);
        
        // Create systems
        this.movementSystem = new MovementSystem(this.entityManager);
        this.healthSystem = new HealthSystem(this.entityManager);
        this.aiSystem = new AISystem(this.entityManager);
        this.collisionSystem = new CollisionSystem(this.entityManager, this);
        
        // Create player entity
        this.playerEntity = this.entityFactory.createPlayer(
            Math.floor(GAME_WIDTH / 2 / TILE_SIZE) * TILE_SIZE,
            Math.floor(GAME_HEIGHT / 2 / TILE_SIZE) * TILE_SIZE,
            this.currentHeroClass
        );
        
        // Create UI elements
        this.createUI();
        
        // Set up event handlers
        this.setupEventHandlers();
        
        // Start spawning enemies
        this.enemySpawnTimer = this.time.addEvent({
            delay: 2000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
        
        // Start spawning pickups
        this.pickupSpawnTimer = this.time.addEvent({
            delay: 10000,
            callback: this.spawnPickup,
            callbackScope: this,
            loop: true
        });
        
        // Start spawning engineers
        this.engineerSpawnTimer = this.time.addEvent({
            delay: 15000,
            callback: this.spawnEngineer,
            callbackScope: this,
            loop: true
        });
    }
    
    setupEngineerClasses() {
        // Check if data is available in DOM elements first
        const engineerClassesData = document.getElementById('engineerClassesData');
        if (engineerClassesData && engineerClassesData.textContent) {
            console.log("Found engineer classes data in DOM!");
            this.classLoader.useTextAreas = true;
        }
        
        // Always use the class loader's engineer classes
        // By this point, classLoader.load() will have populated defaults if needed
        this.engineerClasses = this.classLoader.getAllEngineerClasses();
        console.log(`Using ${Object.keys(this.engineerClasses).length} engineer classes from ClassLoader`);
        
        // Additional debug - dump the actual data
        console.log("Engineer classes:", this.engineerClasses);
        
        // Explicitly log some class details
        if (this.engineerClasses['chronotemporal']) {
            console.log("Chronotemporal details:", {
                range: this.engineerClasses['chronotemporal'].range,
                damage: this.engineerClasses['chronotemporal'].damage,
                cooldown: this.engineerClasses['chronotemporal'].cooldown
            });
        }
        
        // Explicitly log warrior class data
        const commanderClasses = this.classLoader.getAllCommanderClasses();
        if (commanderClasses['warrior']) {
            console.log("Warrior details:", {
                range: commanderClasses['warrior'].range,
                damage: commanderClasses['warrior'].damage,
                cooldown: commanderClasses['warrior'].cooldown
            });
        }
    }
    
    update(time, delta) {
        if (this.gameOver) return;
        
        // Handle input
        this.handleInput();
        
        // Move the snake periodically
        if (time > this.moveTimer) {
            this.moveSnake();
            this.moveTimer = time + this.moveDelay;
        }
        
        // Update all systems
        this.aiSystem.update(delta);
        this.movementSystem.update(delta);
        this.healthSystem.update(delta);
        this.collisionSystem.update(delta);
        
        // Check for player death
        const playerHealth = this.playerEntity.getComponent('HealthComponent');
        if (playerHealth && playerHealth.health <= 0) {
            this.handleGameOver();
        }
        
        // Update special attack cooldown
        const playerSpecial = this.playerEntity.getComponent('SpecialAbilityComponent');
        if (playerSpecial && playerSpecial.cooldown > 0) {
            playerSpecial.cooldown -= delta;
            this.updateCooldownDisplay(playerSpecial.cooldown / playerSpecial.cooldownMax);
        }
        
        // Handle engineer follower special attacks
        this.updateFollowerAttacks(delta);
        
        // Check for engineer collisions
        this.checkEngineerCollisions();
    }
    
    // Update follower attacks
    updateFollowerAttacks(delta) {
        const followers = this.entityManager.getEntitiesWithTag('follower');
        const enemies = this.entityManager.getEntitiesWithTag('enemy');
        
        // Skip if no enemies to attack
        if (!enemies || enemies.length === 0) return;
        
        // Process each follower separately with isolated error handling
        followers.forEach(follower => {
            // Skip invalid followers
            if (!follower || !follower.active) return;
            
            try {
                // Skip followers without special abilities
                if (!follower.hasComponent('SpecialAbilityComponent')) return;
                
                const specialAbility = follower.getComponent('SpecialAbilityComponent');
                if (!specialAbility) return;
                
                // Update cooldown
                if (specialAbility.cooldown > 0) {
                    specialAbility.cooldown -= delta;
                }
                
                // If cooldown complete, try to perform attack
                if (specialAbility.cooldown <= 0) {
                    // Make sure the ability function exists
                    if (typeof specialAbility.abilityFunction !== 'function') {
                        console.error("Invalid ability function for follower");
                        specialAbility.cooldown = 3000; // Prevent constant errors
                        return;
                    }
                    
                    // Isolate the special attack execution
                    let success = false;
                    try {
                        // Execute special attack
                        success = specialAbility.abilityFunction(this, follower, enemies);
                    } catch (attackError) {
                        console.error("Error executing follower special attack:", attackError);
                        // Skip to next follower but don't crash
                        specialAbility.cooldown = 3000; // Prevent constant errors
                        return;
                    }
                    
                    if (success) {
                        // Reset cooldown (possibly with slight variance)
                        const variance = Math.random() * 500 - 250; // ±250ms variance
                        specialAbility.cooldown = specialAbility.cooldownMax + variance;
                        
                        // Visual feedback for attack - isolated in its own try-catch
                        try {
                            const sprite = follower.getComponent('SpriteComponent')?.sprite;
                            if (sprite && sprite.active) {
                                this.tweens.add({
                                    targets: sprite,
                                    scaleX: 1.2,
                                    scaleY: 1.2,
                                    duration: 100,
                                    yoyo: true
                                });
                            }
                        } catch (visualError) {
                            console.error("Error creating attack visual feedback:", visualError);
                            // Not critical, continue without visual feedback
                        }
                    }
                }
            } catch (followerError) {
                console.error("Error processing follower attack:", followerError);
                // This isolates errors to individual followers
            }
        });
    }
    
    // Check for collision with engineers
    checkEngineerCollisions() {
        if (this.engineers.length === 0) return;
        
        const playerSprite = this.playerEntity.getComponent('SpriteComponent').sprite;
        
        // Check each engineer for collision with player
        for (let i = this.engineers.length - 1; i >= 0; i--) {
            const engineer = this.engineers[i];
            
            // Calculate distance between player and engineer
            const distance = Phaser.Math.Distance.Between(
                playerSprite.x, playerSprite.y,
                engineer.x, engineer.y
            );
            
            // If close enough, collect the engineer
            if (distance < TILE_SIZE) {
                this.collectEngineer(engineer);
            }
        }
    }
    
    // Collect an engineer
    collectEngineer(engineer) {
        if (!engineer || !engineer.active) {
            console.warn("Attempted to collect an invalid engineer");
            return;
        }
        
        try {
            // Remove from the engineers array
            const index = this.engineers.indexOf(engineer);
            if (index !== -1) {
                this.engineers.splice(index, 1);
            }
            
            // Safety check for engineer class
            if (!engineer.engineerClass) {
                console.error("Engineer missing class data");
                engineer.destroy();
                return;
            }
            
            // Try to create follower with the engineer's class
            const follower = this.createEngineerFollower(engineer.engineerClass);
            if (!follower) {
                console.error("Failed to create follower");
            }
            
            // Create collection effect
            try {
                const collectionEffect = this.add.particles('particle');
                const emitter = collectionEffect.createEmitter({
                    x: engineer.x,
                    y: engineer.y,
                    speed: { min: 50, max: 150 },
                    scale: { start: 1, end: 0 },
                    lifespan: 800,
                    quantity: 20,
                    tint: engineer.engineerClass.color
                });
                
                emitter.explode();
                
                // Destroy particles after animation completes
                this.time.delayedCall(800, () => {
                    if (collectionEffect && collectionEffect.active) {
                        collectionEffect.destroy();
                    }
                });
            } catch (effectError) {
                console.error("Error creating collection effect:", effectError);
            }
            
            // Add notification text
            try {
                const notification = this.add.text(
                    engineer.x, 
                    engineer.y - 30, 
                    engineer.engineerClass.name + ' Engineer joined!', 
                    {
                        fontSize: '18px',
                        fontFamily: 'Arial',
                        fill: '#FFFFFF',
                        stroke: '#000000',
                        strokeThickness: 3
                    }
                ).setOrigin(0.5);
                
                // Fade out notification
                this.tweens.add({
                    targets: notification,
                    y: notification.y - 50,
                    alpha: 0,
                    duration: 1500,
                    onComplete: () => {
                        if (notification && notification.active) {
                            notification.destroy();
                        }
                    }
                });
            } catch (textError) {
                console.error("Error creating notification text:", textError);
            }
            
            // Safely destroy the engineer sprite
            if (engineer && engineer.active) {
                engineer.destroy();
            }
            
        } catch (error) {
            console.error("Error in collectEngineer:", error);
            // Try to clean up any mess
            if (engineer && engineer.active) {
                engineer.destroy();
            }
        }
    }
    
    // Create an engineer-type follower 
    createEngineerFollower(engineerClass) {
        if (!engineerClass) {
            console.error("Attempted to create follower with null engineer class");
            return null;
        }
        
        try {
            // Get player direction for positioning
            const playerMovement = this.playerEntity.getComponent('MovementComponent');
            if (!playerMovement) {
                console.error("Player missing movement component");
                return null;
            }
            
            const direction = playerMovement.direction || 'right';
            
            // Get position for the new follower
            let x, y;
            const followers = this.entityManager.getEntitiesWithTag('follower');
            
            if (followers.length === 0) {
                // Position behind the player
                const playerPos = this.playerEntity.getComponent('PositionComponent');
                if (!playerPos) {
                    console.error("Player missing position component");
                    return null;
                }
                
                switch (direction) {
                    case 'left':
                        x = playerPos.x + TILE_SIZE;
                        y = playerPos.y;
                        break;
                    case 'right':
                        x = playerPos.x - TILE_SIZE;
                        y = playerPos.y;
                        break;
                    case 'up':
                        x = playerPos.x;
                        y = playerPos.y + TILE_SIZE;
                        break;
                    case 'down':
                        x = playerPos.x;
                        y = playerPos.y - TILE_SIZE;
                        break;
                    default:
                        x = playerPos.x - TILE_SIZE;
                        y = playerPos.y;
                }
            } else {
                // Position behind the last follower
                const lastFollower = followers[followers.length - 1];
                if (!lastFollower) {
                    console.error("Invalid last follower reference");
                    // Fall back to positioning behind player
                    const playerPos = this.playerEntity.getComponent('PositionComponent');
                    x = playerPos.x - TILE_SIZE;
                    y = playerPos.y;
                } else {
                    const lastFollowerPos = lastFollower.getComponent('PositionComponent');
                    if (!lastFollowerPos) {
                        console.error("Last follower missing position component");
                        // Fall back to positioning behind player
                        const playerPos = this.playerEntity.getComponent('PositionComponent');
                        x = playerPos.x - TILE_SIZE;
                        y = playerPos.y;
                    } else {
                        const lastFollowerMovement = lastFollower.getComponent('MovementComponent');
                        const lastDirection = lastFollowerMovement ? lastFollowerMovement.direction : direction;
                        
                        switch (lastDirection) {
                            case 'left':
                                x = lastFollowerPos.x + TILE_SIZE;
                                y = lastFollowerPos.y;
                                break;
                            case 'right':
                                x = lastFollowerPos.x - TILE_SIZE;
                                y = lastFollowerPos.y;
                                break;
                            case 'up':
                                x = lastFollowerPos.x;
                                y = lastFollowerPos.y + TILE_SIZE;
                                break;
                            case 'down':
                                x = lastFollowerPos.x;
                                y = lastFollowerPos.y - TILE_SIZE;
                                break;
                            default:
                                x = lastFollowerPos.x - TILE_SIZE;
                                y = lastFollowerPos.y;
                        }
                    }
                }
            }
            
            // Safety check coordinates
            if (isNaN(x) || isNaN(y)) {
                console.error("Invalid follower coordinates:", x, y);
                // Use default safe position
                x = GAME_WIDTH / 2;
                y = GAME_HEIGHT / 2;
            }
            
            // Create new follower entity with the engineer class
            const follower = this.entityFactory.createFollower(x, y, engineerClass);
            
            // Log success
            console.log(`Created ${engineerClass.name} follower at ${x},${y}`);
            
            return follower;
        } catch (error) {
            console.error("Error in createEngineerFollower:", error);
            return null;
        }
    }
    
    // Spawn an engineer
    spawnEngineer() {
        if (this.gameOver) return;
        
        // Find a valid position
        let x, y;
        let validPosition = false;
        
        // Try to find a position not too close to player or enemies
        let attempts = 0;
        while (!validPosition && attempts < 20) {
            attempts++;
            
            // Choose random position with some margin from edges
            x = Phaser.Math.Between(TILE_SIZE * 2, GAME_WIDTH - TILE_SIZE * 2);
            y = Phaser.Math.Between(TILE_SIZE * 2, GAME_HEIGHT - TILE_SIZE * 2);
            
            // Check distance from player
            const playerSprite = this.playerEntity.getComponent('SpriteComponent').sprite;
            const distanceToPlayer = Phaser.Math.Distance.Between(playerSprite.x, playerSprite.y, x, y);
            
            if (distanceToPlayer < TILE_SIZE * 5) {
                continue; // Too close to player
            }
            
            // Position is valid if we get here
            validPosition = true;
        }
        
        if (!validPosition) {
            // If no position found after max attempts, place randomly
            x = Phaser.Math.Between(TILE_SIZE * 2, GAME_WIDTH - TILE_SIZE * 2);
            y = Phaser.Math.Between(TILE_SIZE * 2, GAME_HEIGHT - TILE_SIZE * 2);
        }
        
        // Choose a random engineer class
        const classKeys = Object.keys(this.engineerClasses);
        const randomClassKey = classKeys[Phaser.Math.Between(0, classKeys.length - 1)];
        const engineerClass = this.engineerClasses[randomClassKey];
        
        // Create engineer sprite
        const engineer = this.physics.add.sprite(x, y, 'follower');
        engineer.setTint(engineerClass.color);
        
        // Store the engineer class on the sprite
        engineer.engineerClass = engineerClass;
        
        // Add pulsing animation
        this.tweens.add({
            targets: engineer,
            scale: 1.2,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // Add to engineers array
        this.engineers.push(engineer);
        
        return engineer;
    }
    
    // Create UI elements
    createUI() {
        // Score text
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fill: '#FFFFFF'
        });
        
        // Hero text
        this.heroText = this.add.text(GAME_WIDTH - 20, 20, this.currentHeroClass.name, {
            fontSize: '24px',
            fontFamily: 'Arial',
            fill: '#FFFFFF'
        }).setOrigin(1, 0);
        
        // Level text
        this.levelText = this.add.text(20, 60, 'Level: 1', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fill: '#FFFFFF'
        });
        
        // Experience bar background
        this.add.rectangle(GAME_WIDTH / 2, 20, GAME_WIDTH - 40, 10, 0x333333);
        
        // Experience bar
        this.experienceBar = this.add.rectangle(20, 20, 0, 10, 0x00FFFF)
            .setOrigin(0, 0);
        
        // Cooldown display
        this.add.text(20, GAME_HEIGHT - 50, 'Special Attack:', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: '#FFFFFF'
        });
        
        // Cooldown bar background
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 30, GAME_WIDTH - 40, 10, 0x333333);
        
        // Cooldown bar
        this.cooldownBar = this.add.rectangle(20, GAME_HEIGHT - 30, GAME_WIDTH - 40, 10, 0xFF0000)
            .setOrigin(0, 0);
        
        // Cooldown text
        this.cooldownText = this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 30, 'READY', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: '#FFFFFF'
        }).setOrigin(1, 0.5);
    }
    
    // Set up event handlers
    setupEventHandlers() {
        // Listen for pickup spawn events
        this.events.on('spawnPickup', (x, y) => {
            this.entityFactory.createPickup(
                x, y, 
                Math.random() < 0.5 ? 'health' : 'experience'
            );
        });
        
        // Listen for move delay updates
        this.events.on('updateMoveDelay', (newDelay) => {
            this.moveDelay = newDelay;
        });
        
        // Listen for level up events
        this.events.on('playerLevelUp', (level) => {
            // Update level text
            this.levelText.setText('Level: ' + level);
        });
    }
    
    // Handle input
    handleInput() {
        const playerMovement = this.playerEntity.getComponent('MovementComponent');
        
        if (!playerMovement) return;
        
        // Handle direction input
        if ((this.cursors.left.isDown || this.cursors.keyA.isDown) && playerMovement.direction !== 'right') {
            playerMovement.nextDirection = 'left';
        } else if ((this.cursors.right.isDown || this.cursors.keyD.isDown) && playerMovement.direction !== 'left') {
            playerMovement.nextDirection = 'right';
        } else if ((this.cursors.up.isDown || this.cursors.keyW.isDown) && playerMovement.direction !== 'down') {
            playerMovement.nextDirection = 'up';
        } else if ((this.cursors.down.isDown || this.cursors.keyS.isDown) && playerMovement.direction !== 'up') {
            playerMovement.nextDirection = 'down';
        }
        
        // Handle special attack input
        const playerSpecial = this.playerEntity.getComponent('SpecialAbilityComponent');
        
        if (Phaser.Input.Keyboard.JustDown(this.specialAttackKey) && 
            playerSpecial && playerSpecial.cooldown <= 0) {
            // Execute special attack
            const success = playerSpecial.abilityFunction(this, this.playerEntity);
            
            if (success) {
                // Set cooldown
                playerSpecial.cooldown = playerSpecial.cooldownMax;
                this.updateCooldownDisplay(1); // Full cooldown
            }
        }
    }
    
    // Move the snake and followers
    moveSnake() {
        const followers = this.entityManager.getEntitiesWithTag('follower');
        const playerSprite = this.playerEntity.getComponent('SpriteComponent').sprite;
        const playerPosition = this.playerEntity.getComponent('PositionComponent');
        const playerMovement = this.playerEntity.getComponent('MovementComponent');
        
        if (!playerSprite || !playerPosition || !playerMovement) return;
        
        // Store previous position for followers
        const prevX = playerPosition.x;
        const prevY = playerPosition.y;
        
        // Update player direction
        playerMovement.direction = playerMovement.nextDirection;
        
        // Move player based on direction
        switch (playerMovement.direction) {
            case 'up':
                playerPosition.y -= TILE_SIZE;
                break;
            case 'down':
                playerPosition.y += TILE_SIZE;
                break;
            case 'left':
                playerPosition.x -= TILE_SIZE;
                break;
            case 'right':
                playerPosition.x += TILE_SIZE;
                break;
        }
        
        // Update sprite position
        playerSprite.x = playerPosition.x;
        playerSprite.y = playerPosition.y;
        
        // Check boundaries
        if (playerPosition.x < 0 || playerPosition.x >= GAME_WIDTH || 
            playerPosition.y < 0 || playerPosition.y >= GAME_HEIGHT) {
            this.handleGameOver();
            return;
        }
        
        // Move followers (in reverse order so each follows the one ahead of it)
        for (let i = followers.length - 1; i >= 0; i--) {
            const follower = followers[i];
            const followerSprite = follower.getComponent('SpriteComponent').sprite;
            const followerPosition = follower.getComponent('PositionComponent');
            
            if (!followerSprite || !followerPosition) continue;
            
            // Store current position before moving
            const oldX = followerPosition.x;
            const oldY = followerPosition.y;
            
            // Move to position of entity ahead
            followerPosition.x = prevX;
            followerPosition.y = prevY;
            
            // Update sprite position
            followerSprite.x = followerPosition.x;
            followerSprite.y = followerPosition.y;
            
            // Store position for next follower
            prevX = oldX;
            prevY = oldY;
        }
    }
    
    // Spawn an enemy
    spawnEnemy() {
        if (this.gameOver) return;
        
        // Determine enemy position (outside screen but not too far)
        let x, y;
        
        // 50% chance to spawn on horizontal edge, 50% on vertical edge
        if (Math.random() < 0.5) {
            // Spawn on left or right edge
            x = Math.random() < 0.5 ? -TILE_SIZE : GAME_WIDTH + TILE_SIZE;
            y = Phaser.Math.Between(0, GAME_HEIGHT);
        } else {
            // Spawn on top or bottom edge
            x = Phaser.Math.Between(0, GAME_WIDTH);
            y = Math.random() < 0.5 ? -TILE_SIZE : GAME_HEIGHT + TILE_SIZE;
        }
        
        // Determine enemy type based on score/level
        const playerExp = this.playerEntity.getComponent('ExperienceComponent');
        const level = playerExp ? playerExp.level : 1;
        
        let enemyType = 'basic';
        
        // Chances for different enemy types based on level
        if (level >= 10 && Math.random() < 0.1) {
            enemyType = 'boss';
        } else if (level >= 5 && Math.random() < 0.2) {
            enemyType = 'tank';
        } else if (Math.random() < 0.3) {
            enemyType = 'fast';
        }
        
        // Create enemy
        this.entityFactory.createEnemy(x, y, enemyType);
    }
    
    // Spawn a pickup
    spawnPickup() {
        if (this.gameOver) return;
        
        // Random position (not too close to edges)
        const x = Phaser.Math.Between(TILE_SIZE * 2, GAME_WIDTH - TILE_SIZE * 2);
        const y = Phaser.Math.Between(TILE_SIZE * 2, GAME_HEIGHT - TILE_SIZE * 2);
        
        // Random pickup type
        const types = ['health', 'experience', 'power'];
        const type = types[Phaser.Math.Between(0, types.length - 1)];
        
        // Create pickup
        this.entityFactory.createPickup(x, y, type);
    }
    
    // Handle game over
    handleGameOver() {
        if (this.gameOver) return;
        
        this.gameOver = true;
        
        // Stop physics
        this.physics.pause();
        
        // Stop timers
        this.enemySpawnTimer.remove();
        this.pickupSpawnTimer.remove();
        this.engineerSpawnTimer.remove();
        
        // Display game over text
        const gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#FF0000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // Display final score
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, `Score: ${this.score}`, {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // Display restart button
        const restartButton = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, 200, 50, 0x666666)
            .setInteractive({ useHandCursor: true });
        
        const restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, 'Restart', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // Restart button interactivity
        restartButton
            .on('pointerover', () => restartButton.fillColor = 0x888888)
            .on('pointerout', () => restartButton.fillColor = 0x666666)
            .on('pointerdown', () => {
                this.scene.start('TitleScene');
            });
    }
    
    // Update cooldown display
    updateCooldownDisplay(percent) {
        // Update cooldown bar width
        this.cooldownBar.width = (GAME_WIDTH - 40) * (1 - percent);
        
        // Update cooldown text
        if (percent <= 0) {
            this.cooldownText.setText('READY');
            this.cooldownText.setFill('#00FF00');
        } else {
            this.cooldownText.setText('COOLDOWN');
            this.cooldownText.setFill('#FFFFFF');
        }
    }
    
    // Create explosion effect
    createExplosion(x, y, color) {
        const particles = this.add.particles('particle');
        
        const emitter = particles.createEmitter({
            x: x,
            y: y,
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            quantity: 20,
            tint: color || 0xFFFFFF
        });
        
        // Self-destruct
        this.time.delayedCall(500, () => {
            particles.destroy();
        });
    }
    
    // Add a method to find commander classes
    getHeroClassFromCSV(heroName) {
        console.log(`Searching for hero class: ${heroName}`);
        
        if (!this.classLoader.loaded) {
            console.error("ClassLoader is not loaded, cannot get hero class data");
            return null;
        }
        
        const commanderClasses = this.classLoader.getAllCommanderClasses();
        
        // Log all commander classes first to debug
        console.log(`All commander classes (${Object.keys(commanderClasses).length} total):`, Object.keys(commanderClasses));
        
        // Try different capitalization versions
        // 1. Direct lookup with original key
        const key = this.classLoader.getClassKey(heroName);
        console.log(`Generated key for "${heroName}": "${key}"`);
        
        // Try direct lookup first
        if (commanderClasses[key]) {
            console.log(`Direct key match found for ${key}:`, commanderClasses[key]);
            return commanderClasses[key];
        } else {
            console.log(`No direct match found for key: ${key}`);
        }
        
        // 2. Look for case-insensitive matching by key
        let csvData = null;
        console.log("Attempting case-insensitive key matching:");
        for (const classKey in commanderClasses) {
            console.log(`  Comparing "${heroName.toLowerCase()}" with "${classKey.toLowerCase()}"`);
            if (classKey.toLowerCase() === heroName.toLowerCase()) {
                csvData = commanderClasses[classKey];
                console.log(`  Found match by key: ${classKey}`, csvData);
                return csvData;
            }
        }
        
        // 3. Search by name field
        console.log("Attempting match by name field:");
        for (const classKey in commanderClasses) {
            const classData = commanderClasses[classKey];
            console.log(`  Class ${classKey} has name: "${classData.name || 'undefined'}"`);
            
            // Check name field with various cases
            const commanderName = classData.name || classData.Name;
            if (commanderName && commanderName.toLowerCase() === heroName.toLowerCase()) {
                csvData = classData;
                console.log(`  Found match by name: ${commanderName}`, csvData);
                return csvData;
            }
        }
        
        // 4. Try partial matching as a last resort
        console.log("Attempting partial name matching:");
        for (const classKey in commanderClasses) {
            if (classKey.includes(heroName.toLowerCase()) || 
                heroName.toLowerCase().includes(classKey)) {
                csvData = commanderClasses[classKey];
                console.log(`  Found partial match: ${classKey}`, csvData);
                return csvData;
            }
            
            // Also check name fields for partial match
            const classData = commanderClasses[classKey];
            const commanderName = classData.name || classData.Name;
            if (commanderName && 
                (commanderName.toLowerCase().includes(heroName.toLowerCase()) || 
                 heroName.toLowerCase().includes(commanderName.toLowerCase()))) {
                csvData = classData;
                console.log(`  Found partial name match: ${commanderName}`, csvData);
                return csvData;
            }
        }
        
        console.warn(`No match found for hero: ${heroName}`);
        return null;
    }
    
    // Update hero classes with CSV data if available
    updateHeroClasses() {
        console.log('Starting updateHeroClasses()');
        
        if (!this.classLoader.loaded) {
            console.warn('No CSV data loaded for hero classes');
            return;
        }
        
        // Get data from CSV
        console.log('Updating hero classes with CSV data');
        
        // Update each hero class with CSV data
        Object.keys(this.heroClasses).forEach(heroKey => {
            console.log(`Processing hero class: ${heroKey}`);
            
            const csvData = this.getHeroClassFromCSV(heroKey);
            if (csvData) {
                console.log(`Found CSV data for ${heroKey}:`, csvData);
                console.log(`${heroKey} range from CSV: ${csvData.range} (${typeof csvData.range})`);
                
                // Update hero class with CSV data - especially range
                if (csvData.range !== undefined) {
                    console.log(`Updating ${heroKey} with range: ${csvData.range}`);
                    
                    if (heroKey === 'warrior') {
                        console.log(`Rebuilding warrior special attack with range: ${csvData.range}`);
                        
                        // Create a new special attack function that uses the CSV range
                        this.heroClasses[heroKey].specialAttack = (scene, entity) => {
                            // Sword sweep (damages all nearby enemies)
                            const range = TILE_SIZE * csvData.range; // Use CSV range
                            console.log(`Warrior attack using range: ${csvData.range} (${range} pixels)`);
                            
                            const position = entity.getComponent('PositionComponent');
                            let enemiesHit = 0;
                            
                            const enemies = this.entityManager.getEntitiesWithTag('enemy');
                            
                            enemies.forEach(enemy => {
                                const enemyPos = enemy.getComponent('PositionComponent');
                                
                                const distance = Phaser.Math.Distance.Between(
                                    position.x, position.y, 
                                    enemyPos.x, enemyPos.y
                                );
                                
                                if (distance <= range) {
                                    // Create explosion effect
                                    this.createExplosion(enemyPos.x, enemyPos.y, 0xFFFF00);
                                    
                                    // Remove enemy
                                    this.entityManager.removeEntity(enemy.id);
                                    
                                    // Increase score
                                    this.score += 5;
                                    this.scoreText.setText('Score: ' + this.score);
                                    
                                    enemiesHit++;
                                }
                            });
                            
                            // Visual effect for sword sweep
                            const sweep = this.add.graphics();
                            sweep.fillStyle(0xFFFF00, 0.3);
                            sweep.fillCircle(position.x, position.y, range);
                            
                            // Fade out and destroy
                            this.tweens.add({
                                targets: sweep,
                                alpha: 0,
                                duration: 300,
                                onComplete: () => {
                                    sweep.destroy();
                                }
                            });
                            
                            return enemiesHit > 0;
                        };
                    }
                }
                
                // Update other properties if needed
                if (csvData.damage !== undefined) {
                    console.log(`Updating ${heroKey} damage: ${csvData.damage}`);
                    this.heroClasses[heroKey].damage = csvData.damage;
                }
                
                if (csvData.color !== undefined && typeof csvData.color === 'number') {
                    console.log(`Updating ${heroKey} color: 0x${csvData.color.toString(16)}`);
                    this.heroClasses[heroKey].color = csvData.color;
                }
            } else {
                console.warn(`No CSV data found for hero class: ${heroKey}, using default`);
                
                // Try to use default commander data if CSV didn't match
                if (heroKey === 'warrior') {
                    const defaultData = this.classLoader.getCommanderClass('warrior');
                    if (defaultData) {
                        console.log(`Using default warrior data with range: ${defaultData.range}`);
                        
                        // Update with default data
                        this.heroClasses[heroKey].specialAttack = (scene, entity) => {
                            // Sword sweep (damages all nearby enemies)
                            const range = TILE_SIZE * defaultData.range; // Use default range
                            console.log(`Warrior using default range: ${defaultData.range} (${range} pixels)`);
                            
                            const position = entity.getComponent('PositionComponent');
                            let enemiesHit = 0;
                            
                            const enemies = this.entityManager.getEntitiesWithTag('enemy');
                            
                            enemies.forEach(enemy => {
                                const enemyPos = enemy.getComponent('PositionComponent');
                                
                                const distance = Phaser.Math.Distance.Between(
                                    position.x, position.y, 
                                    enemyPos.x, enemyPos.y
                                );
                                
                                if (distance <= range) {
                                    // Create explosion effect
                                    this.createExplosion(enemyPos.x, enemyPos.y, 0xFFFF00);
                                    
                                    // Remove enemy
                                    this.entityManager.removeEntity(enemy.id);
                                    
                                    // Increase score
                                    this.score += 5;
                                    this.scoreText.setText('Score: ' + this.score);
                                    
                                    enemiesHit++;
                                }
                            });
                            
                            // Visual effect for sword sweep
                            const sweep = this.add.graphics();
                            sweep.fillStyle(0xFFFF00, 0.3);
                            sweep.fillCircle(position.x, position.y, range);
                            
                            // Fade out and destroy
                            this.tweens.add({
                                targets: sweep,
                                alpha: 0,
                                duration: 300,
                                onComplete: () => {
                                    sweep.destroy();
                                }
                            });
                            
                            return enemiesHit > 0;
                        };
                    }
                }
            }
        });
        
        // Update current hero class
        this.currentHeroClass = this.heroClasses[this.selectedHero];
        console.log(`Updated current hero class to: ${this.selectedHero}`);
    }
}

export default GameScene; 