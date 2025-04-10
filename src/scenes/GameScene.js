import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';
import { createGameTextures } from '../utils/textureGenerator.js';
import * as Helpers from '../utils/helpers.js';
import { heroClasses } from '../data/heroClasses.js';
import { engineerClasses } from '../data/engineerClasses.js';

// Import our new modular systems
import Player from '../entities/Player.js';
import FollowerFactory from '../entities/FollowerFactory.js';
import MovementSystem from '../systems/MovementSystem.js';
import SpawnSystem from '../systems/SpawnSystem.js';
import CombatSystem from '../systems/CombatSystem.js';
import LevelSystem from '../systems/LevelSystem.js';
import UIManager from '../ui/UIManager.js';
import TerrainSystem from '../systems/TerrainSystem.js';
import AudioManager from '../audio/AudioManager.js';

/**
 * Main game scene that coordinates all game systems and entities
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Game state properties
        this.player = null;
        this.followers = []; // Array to track follower sprites for movement order
        this.followersGroup = null; // Physics group for followers
        this.enemies = null;
        this.pickups = null;
        this.bullets = null;
        this.engineers = null; // Collectible engineers group

        this.score = 0;
        this.gameOver = false;
        this.gameActive = true;
        this.selectedHeroKey = 'warrior'; // Default hero
        
        // Helper reference for access by other systems
        this.helpers = Helpers;
        this.engineerClasses = engineerClasses; // Make engineer classes available to other systems
        
        // Systems will be initialized in create()
        this.movementSystem = null;
        this.spawnSystem = null;
        this.combatSystem = null;
        this.levelSystem = null;
        this.uiManager = null;
        this.followerFactory = null;
        this.terrainSystem = null; // New terrain system
        this.audioManager = null; // New audio system
    }
    
    /**
     * Initialize game data from scene parameters
     * @param {object} data - Data passed from previous scene
     */
    init(data) {
        console.log('GameScene init');
        
        // Get selected hero from TitleScene
        this.selectedHeroKey = data.selectedHeroKey || 'warrior'; 
        
        // Reset state variables that persist across scene restarts
        this.resetGameState();
    }

    /**
     * Reset all game state variables to initial values
     */
    resetGameState() {
        this.gameOver = false;
        this.gameActive = true;
        this.score = 0;
        this.followers = [];
        
        // Systems will reset themselves in create()
        console.log('Game state reset for hero:', this.selectedHeroKey);
    }

    /**
     * Load assets and prepare textures
     */
    preload() {
        console.log('GameScene preload started');
        // Textures are already created in TitleScene preload
        // If running GameScene directly, uncomment the line below:
        // createGameTextures(this);
        
        // Initialize audio manager and load audio assets
        this.audioManager = new AudioManager(this);
        this.audioManager.init();
        
        console.log('GameScene assets available');
    }

    /**
     * Create all game objects, systems, and set up the game world
     */
    create() {
        console.log('GameScene create started');

        // --- Set World Bounds ---
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Make sure title music is stopped before playing level music
        if (this.audioManager) {
            // This ensures any previous music (like title music) is completely stopped
            console.log('GameScene: Forcibly stopping any running music before level start');
            this.audioManager.stopMusic(0);
        }

        // --- Create Terrain System ---
        this.terrainSystem = new TerrainSystem(this);
        this.terrainSystem.createTerrain();

        // --- Set Hero Class ---
        const currentHeroClass = heroClasses[this.selectedHeroKey];
        if (!currentHeroClass) {
            console.warn(`Hero key "${this.selectedHeroKey}" not found, defaulting to warrior.`);
            this.selectedHeroKey = 'warrior';
        }
        console.log('Selected hero:', this.selectedHeroKey, 'Hero class:', currentHeroClass.name);
        
        // --- Create Physics Groups ---
        this.createGroups();

        // --- Create Player ---
        this.createPlayer(currentHeroClass);
        
        // --- Create Camera ---
        this.setupCamera();
        
        // --- Create Systems ---
        this.createSystems();
        
        // --- Set up UI ---
        this.setupUI();

        // --- Setup Input ---
        this.setupInput();

        // --- Setup Collisions ---
        this.combatSystem.setupCollisions();
        
        // --- Initial State ---
        this.spawnSystem.spawnPickup(); // Create first pickup
        
        // Set initial level
        this.currentLevel = 1;
        
        // Ensure audio context is unlocked by user interaction before playing music
        this.input.once('pointerdown', () => {
            this.startLevelMusic();
        });
        
        // Also try to play music directly, but this might be blocked by browsers
        this.time.delayedCall(500, () => {
            this.startLevelMusic();
        });
        
        console.log('GameScene create completed');
    }
    
    /**
     * Create all physics groups
     */
    createGroups() {
        // Group for followers
        this.followersGroup = this.physics.add.group({
            runChildUpdate: true
         });
        
        // Group for enemies
        this.enemies = this.physics.add.group({
            runChildUpdate: true
        });
        
        // Group for pickups
         this.pickups = this.physics.add.group({ 
            maxSize: 10
        }); 
        
        // Group for projectiles
         this.bullets = this.physics.add.group({ 
              runChildUpdate: true, 
            maxSize: 50,
            collideWorldBounds: true,
            bounceX: 0,
            bounceY: 0
        });
        
        // Group for engineer collectibles
        this.engineers = this.physics.add.group({
            maxSize: 5
        });

        // Set debug configuration if needed
        console.log("Bullets group created:", this.bullets);
        // Enable collision debug logging
        this.physics.world.on('collide', (obj1, obj2) => {
            if ((obj1.body && obj1.body.gameObject && obj1.body.gameObject.texture && obj1.body.gameObject.texture.key === 'arrow') ||
                (obj2.body && obj2.body.gameObject && obj2.body.gameObject.texture && obj2.body.gameObject.texture.key === 'arrow')) {
                console.log('Arrow collision detected between:', obj1, obj2);
            }
        });
    }
    
    /**
     * Create the player character
     * @param {object} heroClass - The selected hero class data
     */
    createPlayer(heroClass) {
        // Start player near the center of the larger world
        const startX = Math.floor(WORLD_WIDTH / 2 / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        const startY = Math.floor(WORLD_HEIGHT / 2 / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        
        // Create player using our Player class
        this.player = new Player(this, startX, startY, heroClass);
        console.log('Player created at:', this.player.x, this.player.y);
    }

    /**
     * Set up the camera to follow the player
     */
    setupCamera() {
        const camera = this.cameras.main;
        
        // Set camera bounds to match the world size
        camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Set a moderate zoom level that shows enough of the game world
        camera.setZoom(1.2); // Reduced from 1.5 to show more of the world
        
        // Enable camera follow with smoother lerp values
        camera.startFollow(this.player, true, 0.08, 0.08);
        
        // Add a slight deadzone to prevent small movements from scrolling the camera
        camera.setDeadzone(100, 100);
        
        // Add camera fade-in effect on start
        camera.fadeIn(1000, 0, 0, 0);
        
        // Create a UI camera that doesn't move or zoom (for UI elements)
        // Ensure all UI elements have setScrollFactor(0) to make them stay fixed
        
        console.log('Camera setup with zoom level 1.2 and following player');
    }
    
    /**
     * Set up input controls
     */
    setupInput() {
        // Keyboard input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.cursors.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.cursors.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.cursors.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        
        // Special attack key
        this.specialAttackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Basic attack key
        this.basicAttackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

        // Mouse input for right-click attacks
        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.handleBasicAttack(pointer);
            }
        });
        
        console.log('Input controls set up');
    }
    
    /**
     * Create and initialize all game systems
     */
    createSystems() {
        // Create follower factory
        this.followerFactory = new FollowerFactory(this);
        
        // Create movement system
        this.movementSystem = new MovementSystem(this);
        
        // Create spawn system
        this.spawnSystem = new SpawnSystem(this);
        
        // Create combat system
        this.combatSystem = new CombatSystem(this);
        
        // Create level system
        this.levelSystem = new LevelSystem(this);
        this.levelSystem.createUI();
        this.currentLevel = this.levelSystem.currentLevel; // Sync current level
        
        // Create UI manager
        this.uiManager = new UIManager(this);
        
        // Audio manager is initialized in preload
    }
    
    /**
     * Set up UI elements
     */
    setupUI() {
        // Create the UI elements with a consistent depth
        const uiDepth = 100;
        
        // Wave text (shows during wave)
        this.waveText = this.add.text(GAME_WIDTH - 150, 20, '', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        })
        .setScrollFactor(0)
        .setDepth(uiDepth);
        
        // Ready indicator (shows between waves)
        this.readyText = this.add.text(GAME_WIDTH - 150, 20, 'READY', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 3
        })
        .setScrollFactor(0)
        .setDepth(uiDepth)
        .setVisible(false);
        
        // Health display
        this.healthText = this.add.text(16, 106, 'Health: 0/0', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        })
        .setScrollFactor(0)
        .setDepth(uiDepth);
        
        // Update health display initially
        this.updateHealthDisplay();
    }
    
    /**
     * Update health display text
     */
    updateHealthDisplay() {
        if (this.player && this.healthText) {
            this.healthText.setText(`Health: ${Math.floor(this.player.health)}/${this.player.maxHealth}`);
            
            // Color based on health percent
            const healthPercent = this.player.health / this.player.maxHealth;
            let color = '#00ff00'; // Green
            if (healthPercent < 0.3) {
                color = '#ff0000'; // Red
            } else if (healthPercent < 0.6) {
                color = '#ffff00'; // Yellow
            }
            this.healthText.setColor(color);
        }
    }
    
    /**
     * Main update loop called every frame
     * @param {number} time - Current time
     * @param {number} delta - Time since last update
     */
    update(time, delta) {
        if (this.gameOver) return;

        // Update player and its cooldowns
        this.player.update(time, delta);
        
        // Update terrain effects
        if (this.terrainSystem) {
            this.terrainSystem.update();
        }
        
        // Update followers for engineer attacks
        this.followersGroup.getChildren().forEach(follower => {
            if (follower.active) {
                follower.update(time, delta);
            }
        });

        // Handle input
        this.handleInput(time);
        
        // Update movement based on timer
        this.movementSystem.update(time);
        
        // Update UI
        this.uiManager.update();
        
        // Update health display
        this.updateHealthDisplay();
        
        // Level text is now managed by LevelSystem
    }
    
    /**
     * Handle player input
     * @param {number} time - Current time
     */
    handleInput(time) {
        // Handle movement input
        this.movementSystem.handleInput(this.cursors);

        // Special Attack
        if (Phaser.Input.Keyboard.JustDown(this.specialAttackKey)) {
             this.useSpecialAttack();
        }
        
        // Basic Attack (Keyboard)
        if (Phaser.Input.Keyboard.JustDown(this.basicAttackKey)) {
            this.handleBasicAttack(null);
        }
    }
    
    /**
     * Handle basic attack input
     * @param {Phaser.Input.Pointer} pointer - Mouse pointer or null for keyboard attack
     */
    handleBasicAttack(pointer) {
        let targetPosition = null;
        
        if (pointer) {
            targetPosition = {
                x: pointer.worldX,
                y: pointer.worldY
            };
        }
        
        this.player.performBasicAttack(targetPosition);
    }
    
    /**
     * Use the player's special attack
     */
    useSpecialAttack() {
        this.player.useSpecialAttack(this.enemies, this.helpers);
    }
    
    /**
     * Add experience points to level up
     * @param {number} amount - Amount of experience to add
     */
    addExperience(amount) {
        this.levelSystem.addExperience(amount);
    }
    
    /**
     * Create a projectile (delegate to combat system)
     */
    shootProjectile(x, y, dirX, dirY, texture) {
        return this.combatSystem.shootProjectile(x, y, dirX, dirY, texture);
    }
    
    /**
     * Create a poison cloud effect at the specified location
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Cloud radius
     */
    createPoisonCloud(x, y, radius) {
        this.helpers.createPoisonCloud(this, x, y, radius);
    }
    
    /**
     * Create a timed explosion at the specified location
     * @param {number} x - X position
     * @param {number} y - Y position 
     * @param {number} radius - Explosion radius
     * @param {number} delay - Delay before explosion (ms)
     * @param {number} damage - Damage amount
     */
    createTimedExplosion(x, y, radius, delay, damage) {
        this.helpers.createTimedExplosion(this, x, y, radius, delay, damage);
    }
    
    /**
     * Handle game over state
     */
     handleGameOver() {
         if (this.gameOver) return;
        
         console.log("GAME OVER triggered");
         this.gameOver = true;
         this.physics.pause();
        
         // Stop timed events
         this.time.removeAllEvents(); 

        // Visual feedback for game over
        this.cameras.main.shake(500, 0.05);
        this.cameras.main.flash(300, 255, 0, 0);
        
        // Make sure we have the audio manager initialized
        if (!this.audioManager) {
            console.warn("AudioManager not available for game over");
            // Create one if needed
            try {
                this.audioManager = new AudioManager(this);
                this.audioManager.init();
            } catch (error) {
                console.error("Failed to initialize AudioManager:", error);
            }
        }

        // Try multiple approaches to ensure game over sound plays
        // 1. First attempt - stop current music and play game over music
        if (this.audioManager) {
            // Immediately stop any playing music
            this.audioManager.stopMusic(0);
            
            // Use a short delay to ensure the music has stopped
            this.time.delayedCall(100, () => {
                console.log("Playing game over music...");
                // For game over, we want to play once with no fade in
                this.audioManager.playMusic('gameover_music', false, 0);
            });
            
            // 2. Backup approach with longer delay in case first attempt fails
            this.time.delayedCall(500, () => {
                // Only try again if we're still in game over state
                if (this.gameOver && (!this.audioManager.currentMusic || 
                    this.audioManager.currentMusic.key !== 'gameover_music')) {
                    console.log("Retry playing game over music...");
                    this.audioManager.playMusic('gameover_music', false, 0);
                }
            });
            
            // 3. Last resort with absolute fallback beep pattern
            this.time.delayedCall(1000, () => {
                if (this.gameOver && (!this.audioManager.currentMusic || 
                    this.audioManager.currentMusic.key !== 'gameover_music')) {
                    console.log("Using last resort fallback for game over sound");
                    
                    // Play a simple beep pattern as absolute fallback
                    try {
                        this.sound.play('fallback_gameover', { volume: 0.3 });
                        this.time.delayedCall(400, () => {
                            try {
                                this.sound.play('fallback_gameover', { volume: 0.3 });
                            } catch (e) {}
                        });
                    } catch (e) {}
            }
        });
    }

        // Show Game Over UI
        this.uiManager.showGameOverScreen();
    }

    /**
     * Update level display
     */
    updateLevel(level) {
        // Update wave info and current level
        this.currentLevel = level;
        
        // Update the LevelSystem's level
        if (this.levelSystem) {
            this.levelSystem.currentLevel = level;
            if (this.levelSystem.levelText) {
                this.levelSystem.levelText.setText(`Level: ${level}`);
            }
        }
        
        // Check if we need to change the music (new stage)
        if (this.audioManager) {
            this.audioManager.playLevelBGM(level);
        }
        
        // Adjust game difficulty based on level
        this.spawnSystem.adjustEnemySpawnRate(level);
    }

    /**
     * Start the level music with proper handling
     */
    startLevelMusic() {
        if (!this.audioManager) return;
        
        console.log(`Starting level music for level ${this.currentLevel}`);
        
        // Explicitly try stage1 music first
        try {
            this.audioManager.playMusic('bgm_stage1', true, 500);
        } catch (error) {
            console.warn('Error playing stage1 music directly:', error);
            
            // Fallback to level-based music
            try {
                this.audioManager.playLevelBGM(this.currentLevel);
            } catch (error) {
                console.warn('Error playing level BGM:', error);
            }
        }
    }
} 