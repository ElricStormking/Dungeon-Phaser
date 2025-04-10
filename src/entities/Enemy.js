import Character from './Character.js';
import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';

/**
 * Enemy class representing monsters that chase the player
 * Handles movement, status effects, and enemy behavior
 */
export default class Enemy extends Character {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, config.texture || 'enemy', {
            health: config.health || 1,
            maxHealth: config.health || 1, // Set max to initial health
            tint: config.tint || 0xFF0000,
            bodySize: { width: TILE_SIZE * 0.8, height: TILE_SIZE * 0.8 }
        });
        
        // Enemy type and behavior
        this.enemyType = config.enemyType || 'melee';
        this.isBoss = config.isBoss || false;
        
        // Movement and targeting
        this.speed = config.speed || 50;
        this.originalSpeed = this.speed;
        
        // Combat properties
        this.scoreValue = config.scoreValue || 5;
        this.experienceValue = config.experienceValue || 10;
        this.attackDamage = config.damage || 1;
        
        // Special ability properties
        this.specialAbilityCooldown = 0;
        this.specialAbilityCooldownMax = config.specialAbilityCooldownMax || 3000;
        this.dashSpeed = config.dashSpeed || this.speed * 3;
        this.shootRange = config.shootRange || TILE_SIZE * 10;
        this.teleportCooldown = 0;
        this.teleportCooldownMax = config.teleportCooldownMax || 5000;
        this.bossPhase = 1; // Boss phase (1: 100-50% health, 2: 50-25% health, 3: <25% health)
        
        // Status flags
        this.isFrozen = false;
        this.isPoisoned = false;
        this.isDashing = false;
        this.isTeleporting = false;
        this.isBombing = false;
        this.hasDealtDamage = false;
        this.hasDealtDamageToFollower = false;
        
        // Keep track of active effects
        this.activeEffects = new Map();
    }
    
    /**
     * Update method called by physics group
     */
    update(time, delta) {
        super.update(time, delta);
        
        if (!this.active || this.isFrozen) return;
        
        // Update cooldowns
        if (this.specialAbilityCooldown > 0) {
            this.specialAbilityCooldown -= delta;
        }
        
        if (this.teleportCooldown > 0) {
            this.teleportCooldown -= delta;
        }
        
        // Check boss phase transition
        if (this.isBoss) {
            this.checkBossPhaseTransition();
        }
        
        // Enemy behavior based on type
        switch (this.enemyType) {
            case 'melee':
                this.moveTowardPlayer();
                break;
            case 'dasher':
                this.updateDasherBehavior();
                break;
            case 'bomber':
                this.updateBomberBehavior();
                break;
            case 'shooter':
                this.updateShooterBehavior();
                break;
            case 'mage':
                this.updateMageBehavior();
                break;
            case 'boss':
                this.updateBossBehavior();
                break;
            default:
                this.moveTowardPlayer();
        }
    }
    
    /**
     * Move toward the player at current speed
     */
    moveTowardPlayer() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Check for terrain effects (optional - if terrain system exists)
        this.checkTerrainEffects();
        
        // Move toward player using physics
        this.scene.physics.moveToObject(this, player, this.speed);
        
        // Set rotation to face player
        this.rotation = Phaser.Math.Angle.Between(
            this.x, this.y, 
            player.x, player.y
        );
    }
    
    /**
     * Dasher enemy behavior - occasionally dash toward player
     */
    updateDasherBehavior() {
        if (this.isDashing) return;
        
        this.moveTowardPlayer();
        
        // Try to dash if cooldown is ready
        if (this.specialAbilityCooldown <= 0) {
            this.performDash();
        }
    }
    
    /**
     * Perform a dash toward the player
     */
    performDash() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Set dashing state
        this.isDashing = true;
        const originalSpeed = this.speed;
        this.speed = this.dashSpeed;
        
        // Visual effect
        this.setTint(0xFFFF00);
        
        // Dash toward player
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.body.velocity.x = Math.cos(angle) * this.speed;
        this.body.velocity.y = Math.sin(angle) * this.speed;
        
        // Dash duration
        this.scene.time.delayedCall(500, () => {
            if (this.active) {
                this.isDashing = false;
                this.speed = originalSpeed;
                this.clearTint();
                
                // Reset cooldown
                this.specialAbilityCooldown = this.specialAbilityCooldownMax;
            }
        });
    }
    
    /**
     * Bomber enemy behavior - move toward player and explode when close
     */
    updateBomberBehavior() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        this.moveTowardPlayer();
        
        // Check if close enough to explode
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y, player.x, player.y
        );
        
        if (distanceToPlayer < TILE_SIZE * 2 && !this.isBombing) {
            this.startBombSequence();
        }
    }
    
    /**
     * Start the bomb sequence
     */
    startBombSequence() {
        this.isBombing = true;
        this.body.velocity.x = 0;
        this.body.velocity.y = 0;
        
        // Flash red and expand
        const flashTween = this.scene.tweens.add({
            targets: this,
            alpha: 0.2,
            scale: 1.5,
            duration: 200,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                if (!this.active) return;
                this.explode();
            }
        });
    }
    
    /**
     * Explode the bomber enemy
     */
    explode() {
        if (!this.active) return;
        
        const explosionRadius = TILE_SIZE * 3;
        
        // Create explosion effect
        const explosion = this.scene.add.graphics();
        explosion.fillStyle(0xFF0000, 0.7);
        explosion.fillCircle(this.x, this.y, explosionRadius);
        
        // Add particles
        const particles = this.scene.add.particles(this.x, this.y, 'particle', {
            speed: { min: 50, max: 200 },
            scale: { start: 1, end: 0 },
            lifespan: 800,
            quantity: 30,
            tint: [0xFF0000, 0xFF5500, 0xFFAA00],
            blendMode: 'ADD',
            emitting: false
        });
        particles.explode(30);
        
        // Damage player and followers if in range
        const player = this.scene.player;
        if (player && player.active && 
            Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= explosionRadius) {
            player.damage(this.attackDamage * 2);
        }
        
        // Damage followers
        this.scene.followersGroup.getChildren().forEach(follower => {
            if (follower.active && 
                Phaser.Math.Distance.Between(this.x, this.y, follower.x, follower.y) <= explosionRadius) {
                follower.damage(this.attackDamage);
            }
        });
        
        // Fade out and cleanup
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 1.5,
            duration: 500,
            onComplete: () => {
                explosion.destroy();
                this.scene.time.delayedCall(800, () => {
                    if (particles && particles.active) particles.destroy();
                });
            }
        });
        
        // Self-destruct
        this.die();
    }
    
    /**
     * Shooter enemy behavior - keep distance and shoot projectiles
     */
    updateShooterBehavior() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y, player.x, player.y
        );
        
        // Set rotation to face player
        this.rotation = Phaser.Math.Angle.Between(
            this.x, this.y, player.x, player.y
        );
        
        // Move toward player if far away
        if (distanceToPlayer > this.shootRange) {
            this.moveTowardPlayer();
        } 
        // Move away from player if too close
        else if (distanceToPlayer < this.shootRange / 2) {
            const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
            this.body.velocity.x = Math.cos(angle) * this.speed;
            this.body.velocity.y = Math.sin(angle) * this.speed;
        }
        // Shoot if within range and cooldown ready
        else {
            this.body.velocity.x = 0;
            this.body.velocity.y = 0;
            
            if (this.specialAbilityCooldown <= 0) {
                this.shootAtPlayer();
            }
        }
    }
    
    /**
     * Shoot a projectile at the player
     */
    shootAtPlayer() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Get access to the combat system
        const combatSystem = this.scene.combatSystem || this.scene;
        if (!combatSystem.shootProjectile) {
            console.warn('No shootProjectile method found in scene or combatSystem');
            return;
        }
        
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        
        // Create the projectile using combat system
        const projectile = combatSystem.shootProjectile(this.x, this.y, dirX, dirY, 'bullet');
        
        if (projectile) {
            // Set properties
            projectile.setTint(0xFF0000);
            projectile.damage = this.attackDamage;
            projectile.isEnemyProjectile = true; // Flag for collision handling
            
            // Explicitly ensure the projectile is fired with velocity
            projectile.setSpeed(120); // Slightly faster than before
            projectile.fire(dirX, dirY); // Call fire again to guarantee velocity is set
            
            // Add a lifespan to ensure cleanup
            projectile.setLifespan(5000); // 5 seconds max lifetime
            
            // Debug output
            console.log(`Enemy projectile fired: vx=${projectile.body.velocity.x}, vy=${projectile.body.velocity.y}`);
        }
        
        // Reset cooldown
        this.specialAbilityCooldown = this.specialAbilityCooldownMax;
    }
    
    /**
     * Mage enemy behavior - teleport and cast spells
     */
    updateMageBehavior() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Try to teleport if cooldown is ready
        if (this.teleportCooldown <= 0 && !this.isTeleporting) {
            this.teleport();
            return;
        }
        
        // Shoot if within range and cooldown ready
        const distanceToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y, player.x, player.y
        );
        
        if (distanceToPlayer < this.shootRange && this.specialAbilityCooldown <= 0) {
            this.castSpell();
        }
        // Otherwise move slowly toward player
        else {
            this.moveTowardPlayer();
        }
    }
    
    /**
     * Teleport to a random location near the player
     */
    teleport() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        this.isTeleporting = true;
        
        // Visual effect before teleport
        this.setAlpha(0.5);
        this.body.velocity.x = 0;
        this.body.velocity.y = 0;
        
        // Fade out
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                if (!this.active) return;
                
                // Find new position
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const distance = Phaser.Math.Between(TILE_SIZE * 5, TILE_SIZE * 10);
                const newX = Phaser.Math.Clamp(
                    player.x + Math.cos(angle) * distance,
                    TILE_SIZE, WORLD_WIDTH - TILE_SIZE
                );
                const newY = Phaser.Math.Clamp(
                    player.y + Math.sin(angle) * distance,
                    TILE_SIZE, WORLD_HEIGHT - TILE_SIZE
                );
                
                // Move to new position
                this.setPosition(newX, newY);
                
                // Fade in
                this.scene.tweens.add({
                    targets: this,
                    alpha: 1,
                    duration: 300,
                    onComplete: () => {
                        this.isTeleporting = false;
                        this.teleportCooldown = this.teleportCooldownMax;
                    }
                });
            }
        });
    }
    
    /**
     * Cast a spell attack
     */
    castSpell() {
        const player = this.scene.player;
        if (!player || !player.active) return;
        
        // Get access to the combat system
        const combatSystem = this.scene.combatSystem || this.scene;
        if (!combatSystem.shootProjectile) {
            console.warn('No shootProjectile method found in scene or combatSystem');
            return;
        }
        
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        
        // Create special projectile
        const projectile = combatSystem.shootProjectile(this.x, this.y, dirX, dirY, 'bullet');
        if (projectile) {
            // Set properties
            projectile.setTint(0xA020F0); // Purple for magic
            projectile.damage = this.attackDamage;
            projectile.isEnemyProjectile = true;
            projectile.setScale(1.5); // Larger projectile
            
            // Explicitly ensure the projectile is fired with velocity
            projectile.setSpeed(100); // Magic spell speed
            projectile.fire(dirX, dirY); // Call fire again to guarantee velocity is set
            
            // Add a lifespan to ensure cleanup
            projectile.setLifespan(5000); // 5 seconds max lifetime
            
            // Debug output
            console.log(`Enemy spell fired: vx=${projectile.body.velocity.x}, vy=${projectile.body.velocity.y}`);
        }
        
        // Reset cooldown
        this.specialAbilityCooldown = this.specialAbilityCooldownMax;
    }
    
    /**
     * Update boss behavior based on the current phase
     */
    updateBossBehavior() {
        if (!this.active) return;
        
        // Basic movement
        this.moveTowardPlayer();
        
        // Execute phase-specific behavior
        switch (this.bossType) {
            case 'summoner':
                this.updateSummonerBossBehavior();
                break;
            case 'berserker':
                this.updateBerserkerBossBehavior();
                break;
            case 'alchemist':
                this.updateAlchemistBossBehavior();
                break;
            case 'lichking':
                this.updateLichKingBossBehavior();
                break;
            default:
                this.moveTowardPlayer();
        }
    }
    
    /**
     * Check if boss should transition to the next phase
     */
    checkBossPhaseTransition() {
        const healthPercent = this.health / this.maxHealth * 100;
        
        if (healthPercent <= 25 && this.bossPhase < 3) {
            this.bossPhase = 3;
            this.onBossPhaseChange();
        } 
        else if (healthPercent <= 50 && this.bossPhase < 2) {
            this.bossPhase = 2;
            this.onBossPhaseChange();
        }
    }
    
    /**
     * Handle boss phase transition
     */
    onBossPhaseChange() {
        // Visual feedback for phase change
        this.scene.cameras.main.shake(300, 0.01);
        
        const flashTween = this.scene.tweens.add({
            targets: this,
            alpha: 0.4,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                if (!this.active) return;
                this.setAlpha(1);
                this.setScale(1);
                
                // Reduce cooldowns and increase damage for later phases
                this.specialAbilityCooldownMax *= 0.7;
                this.teleportCooldownMax *= 0.7;
                this.attackDamage = Math.floor(this.attackDamage * 1.5);
                this.speed *= 1.2;
            }
        });
    }
    
    /**
     * Apply frost status effect
     * @param {number} duration - Duration in ms
     * @param {number} slowFactor - Factor to slow movement (0-1)
     */
    applyFrost(duration, slowFactor = 0.5) {
        if (this.isFrozen) return;
        
        this.setTint(0x00FFFF);
        this.isFrozen = true;
        
        if (!this.originalSpeed) this.originalSpeed = this.speed;
        this.speed = this.originalSpeed * slowFactor;
        
        // Store original velocity to apply slow
        if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
            this.body.velocity.x *= slowFactor;
            this.body.velocity.y *= slowFactor;
        }
        
        // Clear existing frost timer if any
        if (this.activeEffects.has('frost')) {
            this.activeEffects.get('frost').remove();
        }
        
        // Set timer to clear frost
        const frostTimer = this.scene.time.delayedCall(duration, () => {
            if (this.active) {
                this.clearFrost();
            }
            this.activeEffects.delete('frost');
        });
        
        this.activeEffects.set('frost', frostTimer);
    }
    
    /**
     * Clear frost status effect
     */
    clearFrost() {
        this.clearTint();
        this.isFrozen = false;
        if (this.originalSpeed) {
            this.speed = this.originalSpeed;
        }
    }
    
    /**
     * Apply poison status effect
     * @param {number} damagePerTick - Damage per tick
     * @param {number} ticks - Number of damage ticks
     */
    applyPoison(damagePerTick, ticks) {
        if (!this.active || this.isPoisoned) return;
        
        this.isPoisoned = true;
        this.setTint(0x90EE90);
        
        // Clear existing poison timer if any
        if (this.activeEffects.has('poison')) {
            this.activeEffects.get('poison').remove();
        }
        
        let currentTicks = 0;
        const poisonTimer = this.scene.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.active) {
                    poisonTimer.remove();
                    return;
                }
                
                this.damage(damagePerTick);
                currentTicks++;
                
                if (currentTicks >= ticks) {
                    this.isPoisoned = false;
                    this.clearTint();
                    poisonTimer.remove();
                    this.activeEffects.delete('poison');
                }
            },
            loop: true
        });
        
        this.activeEffects.set('poison', poisonTimer);
    }
    
    /**
     * Check terrain effects at current position
     */
    checkTerrainEffects() {
        // Optional - if terrain system exists
        const terrainLayer = this.scene.terrainLayer;
        if (!terrainLayer) return;
        
        const tile = terrainLayer.getTileAtWorldXY(this.x, this.y);
        if (tile && tile.properties && tile.properties.slows) {
            // Apply terrain slowdown
            if (this.originalSpeed === undefined) {
                this.originalSpeed = this.speed;
            }
            const terrainSlowFactor = 0.4; // Significantly slower in forest
            this.speed = this.originalSpeed * terrainSlowFactor;
        } 
        else if (this.originalSpeed !== undefined && !this.isFrozen) {
            // Reset speed if not slowed by other effects
            this.speed = this.originalSpeed;
            delete this.originalSpeed;
        }
    }
    
    /**
     * Override die method to add game-specific logic
     */
    die() {
        // Clear all active effect timers
        this.activeEffects.forEach(timer => {
            if (timer && timer.remove) {
                timer.remove();
            }
        });
        this.activeEffects.clear();
        
        // Add score and experience
        if (this.scene.score !== undefined) {
            this.scene.score += this.scoreValue;
            if (this.scene.uiManager) {
                this.scene.uiManager.updateScore(this.scene.score);
            }
        }
        
        if (typeof this.scene.addExperience === 'function') {
            this.scene.addExperience(this.experienceValue);
        }
        
        // Create death effect and destroy
        this.createDeathEffect();
        this.destroy();
    }
    
    /**
     * Factory method to create different enemy types with appropriate difficulty scaling
     */
    static createEnemy(scene, x, y, level = 1, type = null) {
        // Determine type if not specified
        if (!type) {
            // As level increases, introduce more complex enemy types
            if (level <= 3) {
                type = 'melee'; // Early levels only have melee enemies
            } else {
                const enemyTypes = ['melee'];
                if (level > 3) enemyTypes.push('dasher');
                if (level > 6) enemyTypes.push('bomber');
                if (level > 10) enemyTypes.push('shooter');
                if (level > 15) enemyTypes.push('mage');
                
                // Weighted probabilities: more melee enemies, fewer mages
                let weights = [50, 25, 15, 10, 5]; // Default weights
                
                // Adjust based on level
                if (level > 20) {
                    weights = [20, 25, 20, 20, 15]; // More varied distribution in later levels
                }
                
                // Select type based on weights
                const weightSum = weights.slice(0, enemyTypes.length).reduce((a, b) => a + b, 0);
                let random = Phaser.Math.Between(1, weightSum);
                let index = 0;
                
                for (let i = 0; i < enemyTypes.length; i++) {
                    random -= weights[i];
                    if (random <= 0) {
                        index = i;
                        break;
                    }
                }
                
                type = enemyTypes[index];
            }
        }
        
        // Base configuration for level scaling
        const baseSpeed = 40 + (level * 2);
        const baseHealth = 1 + Math.floor(level / 3);
        
        // Configure based on enemy type
        let config = {
            enemyType: type,
            health: baseHealth,
            speed: baseSpeed,
            attackDamage: 1,
            scoreValue: baseHealth * 5,
            experienceValue: baseHealth * 2,
            specialAbilityCooldownMax: 3000
        };
        
        // Customize based on enemy type
        switch (type) {
            case 'melee':
                config.tint = 0xFF0000;
                config.speed = baseSpeed;
                break;
            case 'dasher':
                config.tint = 0xFF6600;
                config.speed = baseSpeed * 0.8;
                config.dashSpeed = baseSpeed * 3;
                config.specialAbilityCooldownMax = 5000 - (level * 100);
                config.scoreValue *= 1.5;
                config.experienceValue *= 1.5;
                break;
            case 'bomber':
                config.tint = 0x00FF00;
                config.speed = baseSpeed * 0.6;
                config.health = Math.max(1, baseHealth - 1);
                config.attackDamage = 2;
                config.scoreValue *= 2;
                config.experienceValue *= 2;
                break;
            case 'shooter':
                config.tint = 0x0000FF;
                config.speed = baseSpeed * 0.7;
                config.shootRange = TILE_SIZE * 12;
                config.specialAbilityCooldownMax = 2000 - (level * 50);
                config.attackDamage = Math.ceil(baseHealth / 2);
                config.scoreValue *= 2;
                config.experienceValue *= 1.5;
                break;
            case 'mage':
                config.tint = 0x9900FF;
                config.speed = baseSpeed * 0.6;
                config.health = Math.max(1, baseHealth - 1);
                config.attackDamage = Math.ceil(baseHealth / 2) + 1;
                config.teleportCooldownMax = 6000 - (level * 100);
                config.specialAbilityCooldownMax = 3000 - (level * 75);
                config.scoreValue *= 3;
                config.experienceValue *= 2;
                break;
        }
        
        return new Enemy(scene, x, y, config);
    }
    
    /**
     * Factory method to create a boss enemy
     */
    static createBoss(scene, x, y, stageNumber) {
        let bossType;
        let config = {
            isBoss: true,
            enemyType: 'boss'
        };
        
        switch (stageNumber) {
            case 1:
                bossType = 'summoner';
                config.tint = 0x00FF00; // Green
                config.health = 50;
                config.speed = 30;
                config.attackDamage = 2;
                break;
            case 2:
                bossType = 'berserker';
                config.tint = 0xFF0000; // Red
                config.health = 75;
                config.speed = 40;
                config.attackDamage = 3;
                break;
            case 3:
                bossType = 'alchemist';
                config.tint = 0x9900FF; // Purple
                config.health = 100;
                config.speed = 35;
                config.attackDamage = 3;
                break;
            case 4:
                bossType = 'lichking';
                config.tint = 0x6600CC; // Dark purple
                config.health = 150;
                config.speed = 30;
                config.attackDamage = 4;
                break;
            default:
                bossType = 'summoner';
                config.health = 50;
                config.speed = 30;
        }
        
        config.bossType = bossType;
        config.scoreValue = config.health * 5;
        config.experienceValue = config.health * 3;
        config.specialAbilityCooldownMax = 5000;
        config.scale = 1.5; // Bosses are larger
        
        const boss = new Enemy(scene, x, y, config);
        boss.setScale(1.5);
        
        return boss;
    }
} 