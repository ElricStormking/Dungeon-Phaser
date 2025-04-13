import Character from './Character.js';
import { TILE_SIZE } from '../constants.js';

/**
 * Follower class representing snake body segments
 * Regular followers are just body parts, engineer followers have special abilities
 */
export default class Follower extends Character {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'follower', {
            health: config.isEngineer ? 2 : 1,
            maxHealth: config.isEngineer ? 2 : 1,
            direction: config.direction || 'right',
            tint: config.tint || 0x00FFFF,
            bodySize: { width: TILE_SIZE * 0.8, height: TILE_SIZE * 0.8 }
        });
        
        // Generate a unique name for tracking
        this.name = config.isEngineer ? 
            `engineer_${scene.followers.length}` : 
            `follower_${scene.followers.length}`;
        
        // Engineer properties
        this.isEngineerFollower = config.isEngineer || false;
        
        if (this.isEngineerFollower && config.engineerClass) {
            this.engineerClass = config.engineerClass;
            // Initialize cooldown values
            this.specialAttackCooldown = 0; // Start at 0 to allow first attack quickly
            this.specialAttackCooldownMax = 0; // Will be set in initEngineerCooldown
            this.initEngineerCooldown();
        }
        
        // Set angle based on direction
        this.setAngleFromDirection();
    }
    
    /**
     * Initialize engineer ability cooldown based on class
     */
    initEngineerCooldown() {
        if (!this.engineerClass) return;
        
        let baseAttackCooldown = 3000;
        
        // Set base cooldown by class type
        switch (this.engineerClass.name) {
            case 'Shotgunner': case 'Holy Bard': case 'Shaman': 
                baseAttackCooldown = 4000; 
                break;
            case 'Sniper': case 'Dark Mage': case 'Thunder Mage': 
                baseAttackCooldown = 5000; 
                break;
            case 'Ninja': case 'Voltaic': 
                baseAttackCooldown = 3500; 
                break;
            case 'Chronotemporal': case 'Ice Mage': 
                baseAttackCooldown = 4500; 
                break;
            case 'Goblin Trapper': 
                baseAttackCooldown = 15000; // 15 seconds for Mega Bomb
                break;
            case 'Shroom Pixie': 
                baseAttackCooldown = 4000; 
                break;
            default:
                baseAttackCooldown = 3000;
                console.log(`Unknown engineer class: ${this.engineerClass.name}, using default cooldown`);
        }
        
        // Apply level-based cooldown reduction
        const cooldownReduction = Math.min(0.4, this.scene.levelSystem?.currentLevel * 0.03 || 0);
        baseAttackCooldown = Math.max(1500, baseAttackCooldown * (1 - cooldownReduction));
        
        // Add some randomness to prevent all engineers attacking at once
        this.specialAttackCooldownMax = baseAttackCooldown + Phaser.Math.Between(-300, 300);
        
        // Debug log
        console.log(`Engineer ${this.name} (${this.engineerClass.name}) initialized with cooldown: ${this.specialAttackCooldownMax}ms`);
    }
    
    /**
     * Update engineer's special ability cooldown and try to use it
     */
    updateEngineerAttack(delta, enemies) {
        if (!this.isEngineerFollower || !this.engineerClass) return;
        
        // Update cooldown
        if (this.specialAttackCooldown > 0) {
            this.specialAttackCooldown -= delta;
        }
        
        // Try to use special attack if off cooldown and enemies exist
        if (this.specialAttackCooldown <= 0 && enemies.countActive(true) > 0) {
            // Set initial cooldown if not set yet
            if (this.specialAttackCooldownMax === undefined) {
                this.initEngineerCooldown();
            }
            
            const attackSuccess = this.engineerClass.specialAttack(
                this.scene, 
                this, 
                enemies, 
                this.scene.helpers
            );
            
            if (attackSuccess) {
                // Add random variance to prevent synchronized attacks
                const randomVariance = Phaser.Math.Between(-300, 300);
                this.specialAttackCooldown = this.specialAttackCooldownMax + randomVariance;
                
                // Visual feedback
                this.scene.tweens.add({ 
                    targets: this, 
                    scaleX: 1.2, 
                    scaleY: 1.2, 
                    duration: 100, 
                    yoyo: true 
                });
                
                console.log(`Engineer ${this.name} attack success, next attack in ${this.specialAttackCooldown/1000}s`);
            }
        }
    }
    
    /**
     * Update method called by physics group
     */
    update(time, delta) {
        super.update(time, delta);
        
        // Update engineer abilities
        if (this.isEngineerFollower && this.active) {
            this.updateEngineerAttack(delta, this.scene.enemies);
        }
    }
    
    /**
     * Factory method to create a standard follower
     */
    static createFollower(scene, x, y, direction) {
        const follower = new Follower(scene, x, y, {
            direction: direction,
            tint: scene.player.tintTopLeft,
            isEngineer: false
        });
        
        return follower;
    }
    
    /**
     * Factory method to create an engineer follower
     */
    static createEngineerFollower(scene, x, y, direction, engineerClass) {
        const follower = new Follower(scene, x, y, {
            direction: direction,
            tint: engineerClass.color,
            isEngineer: true,
            engineerClass: engineerClass
        });
        
        return follower;
    }
} 