import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, UI_PADDING } from '../constants.js';
import { createGameTextures } from '../utils/textureGenerator.js';
import * as Helpers from '../utils/helpers.js';
import { heroClasses } from '../data/heroClasses.js';
import { engineerClasses } from '../data/engineerClasses.js';
import ResourceManager from '../utils/ResourceManager.js';

// Import our new modular systems
import Player from '../entities/Player.js';
import FollowerFactory from '../entities/FollowerFactory.js';
import EntityFactory from '../entities/EntityFactory.js';
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
        this.entityFactory = null;
        this.resourceManager = null; // Resource manager for object pooling
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
        console.log('GameScene preload - Starting preload process');
        
        // Initialize audio manager
        if (!this.audioManager) {
            console.log('Initializing AudioManager in GameScene preload');
            this.audioManager = new AudioManager(this);
            this.audioManager.init();
        }
        
        // Load all map backgrounds
        this.load.image('gamemap_01', 'assets/images/backgrounds/gamemap_01.jpg');
        this.load.image('gamemap_02', 'assets/images/backgrounds/gamemap_02.jpg');
        this.load.image('gamemap_03', 'assets/images/backgrounds/gamemap_03.jpg');
        this.load.image('gamemap_04', 'assets/images/backgrounds/gamemap_04.jpg');
        
        // Load character assets - only load for the selected hero
        const heroKey = this.selectedHeroKey || 'warrior';
        console.log(`Loading assets for selected hero: ${heroKey}`);
        
        // Load the selected hero's spritesheet
        this.load.spritesheet(heroKey, `assets/images/characters/${heroKey}.png`, {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        // Load engineer class sprite sheets
        console.log('Loading Chronotemporal spritesheet');
        this.load.spritesheet('Chronotemporal', 'assets/images/characters/Chronotemporal.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Voltaic spritesheet');
        this.load.spritesheet('Voltaic', 'assets/images/characters/Voltaic.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Thunder Mage spritesheet');
        this.load.spritesheet('Thunder Mage', 'assets/images/characters/Thunder Mage.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Sniper spritesheet');
        this.load.spritesheet('Sniper', 'assets/images/characters/Sniper.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Ice Mage spritesheet');
        this.load.spritesheet('Ice Mage', 'assets/images/characters/Ice Mage.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Dark Mage spritesheet');
        this.load.spritesheet('Dark Mage', 'assets/images/characters/Dark Mage.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Ninja spritesheet');
        this.load.spritesheet('Ninja', 'assets/images/characters/Ninja.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Shotgunner spritesheet');
        this.load.spritesheet('Shotgunner', 'assets/images/characters/Shotgunner.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Goblin Trapper spritesheet');
        this.load.spritesheet('Goblin Trapper', 'assets/images/characters/Goblin Trapper.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Shaman spritesheet');
        this.load.spritesheet('Shaman', 'assets/images/characters/Shaman.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Holy Bard spritesheet');
        this.load.spritesheet('Holy Bard', 'assets/images/characters/Holy Bard.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        console.log('Loading Shroom Pixie spritesheet');
        this.load.spritesheet('Shroom Pixie', 'assets/images/characters/Shroom Pixie.png', {
            frameWidth: 96,
            frameHeight: 96,
            margin: 0,
            spacing: 0
        });
        
        // Note: We're no longer loading JSON animation files since we're creating
        // animations directly from the sprite sheet in the Player class
        
        // Load enemy assets
        this.load.spritesheet('enemy', 'assets/images/enemies/basic_enemy.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        
        // Load combat assets
        this.load.image('bullet', 'assets/images/projectiles/particle.png');
        this.load.image('particle', 'assets/images/effects/particle.png');
        this.load.image('arrow', 'assets/images/projectiles/arrow.png');
        
        console.log('GameScene preload - Assets loaded');
    }

    /**
     * Create all game objects, systems, and set up the game world
     */
    create() {
        console.log('GameScene create - Starting game scene setup');
        console.log(`Selected hero class: ${this.selectedHeroKey}`);

        // Initialize resource manager first for other systems to use
        this.resourceManager = new ResourceManager(this);
        console.log('Resource manager initialized');

        // Create the game map - directly use imported constants 
        
        // Add background image (default to stage 1)
        this.updateBackgroundForLevel(1);
        
        // Set world bounds
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
        
        // Verify hero class has key property that matches selection
        if (currentHeroClass && (!currentHeroClass.key || currentHeroClass.key !== this.selectedHeroKey)) {
            console.warn(`Hero class key mismatch. Selected: ${this.selectedHeroKey}, Class key: ${currentHeroClass.key}`);
            // Fix the key to match selection
            currentHeroClass.key = this.selectedHeroKey;
        }
        
        console.log('Selected hero:', this.selectedHeroKey, 'Hero class:', currentHeroClass?.name, 'Key:', currentHeroClass?.key);
        
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
            console.log('User interaction detected, trying to play level music');
            this.startLevelMusic();
        });
        
        // Also try to play music directly, with a slightly longer delay
        this.time.delayedCall(1000, () => {
            if (this.audioManager && this.audioManager.initialized) {
                console.log('Delayed attempt to start level music');
                this.startLevelMusic();
            } else {
                console.warn('Audio manager not ready for delayed music start');
            }
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
        
        // Validate hero class data
        if (!heroClass) {
            console.error('No hero class provided to createPlayer');
            heroClass = heroClasses['warrior']; // Fallback to warrior
        }
        
        // Ensure the hero class has the key property
        if (!heroClass.key) {
            console.warn(`Hero class ${heroClass.name} missing key property, setting to: ${this.selectedHeroKey}`);
            heroClass.key = this.selectedHeroKey;
        }
        
        // Debug logs
        console.log(`Creating player with hero class: ${heroClass.name}, texture key: ${heroClass.key}`);
        
        // Delegate to entity factory instead of directly creating Player
        if (!this.entityFactory) {
            // Create entity factory if not already available
            this.entityFactory = new EntityFactory(this);
        }
        
        // Use factory to create player
        this.player = this.entityFactory.createPlayer(startX, startY, heroClass);
        console.log('Player created at:', this.player.x, this.player.y);
        
        return this.player;
    }

    /**
     * Set up the camera to follow the player
     */
    setupCamera() {
        const camera = this.cameras.main;
        
        // Set camera bounds to match the world size
        camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Calculate zoom to fit game canvas size
        const zoomX = GAME_WIDTH / camera.width;
        const zoomY = GAME_HEIGHT / camera.height;
        const zoom = Math.min(zoomX, zoomY);
        camera.setZoom(zoom);
        
        // Enable camera follow with smoother lerp values
        camera.startFollow(this.player, true, 0.08, 0.08);
        
        // Add a slight deadzone to prevent small movements from scrolling the camera
        camera.setDeadzone(100, 100);
        
        // Add camera fade-in effect on start
        camera.fadeIn(1000, 0, 0, 0);
        
        console.log('Camera setup with calculated zoom level:', zoom);
    }
    
    /**
     * Set up keyboard input and touch controls
     */
    setupInput() {
        // Make WASD/arrows move the player
        this.cursorKeys = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
            special: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            chrono: Phaser.Input.Keyboard.KeyCodes.C,
            voltaic: Phaser.Input.Keyboard.KeyCodes.V,
            darkMage: Phaser.Input.Keyboard.KeyCodes.M,
            ninja: Phaser.Input.Keyboard.KeyCodes.N,
            shotgunner: Phaser.Input.Keyboard.KeyCodes.G,
            goblinTrapper: Phaser.Input.Keyboard.KeyCodes.T,
            shaman: Phaser.Input.Keyboard.KeyCodes.H,
            holyBard: Phaser.Input.Keyboard.KeyCodes.B,
            shroomPixie: Phaser.Input.Keyboard.KeyCodes.P
        });
        
        // Enable pointer input for touch/mouse
        this.input.addPointer(3); // Support up to 3 touch points
        
        // Add debug key for Chronotemporal follower
        this.chronoKey = this.input.keyboard.addKey('C');
        this.input.keyboard.on('keydown-C', () => {
            console.log('C key pressed - creating Chronotemporal follower');
            this.addChronotemporalFollower();
        });
        
        // Add debug key for Voltaic follower
        this.voltaicKey = this.input.keyboard.addKey('V');
        this.input.keyboard.on('keydown-V', () => {
            console.log('V key pressed - creating Voltaic follower');
            this.addVoltaicFollower();
        });
        
        // Add debug key for Dark Mage follower
        this.darkMageKey = this.input.keyboard.addKey('M');
        this.input.keyboard.on('keydown-M', () => {
            console.log('M key pressed - creating Dark Mage follower');
            this.addDarkMageFollower();
        });
        
        // Add debug key for Ninja follower
        this.ninjaKey = this.input.keyboard.addKey('N');
        this.input.keyboard.on('keydown-N', () => {
            console.log('N key pressed - creating Ninja follower');
            this.addNinjaFollower();
        });
        
        // Add debug key for Shotgunner follower
        this.shotgunnerKey = this.input.keyboard.addKey('G');
        this.input.keyboard.on('keydown-G', () => {
            console.log('G key pressed - creating Shotgunner follower');
            this.addShotgunnerFollower();
        });
        
        // Add debug key for Goblin Trapper follower
        this.goblinTrapperKey = this.input.keyboard.addKey('T');
        this.input.keyboard.on('keydown-T', () => {
            console.log('T key pressed - creating Goblin Trapper follower');
            this.addGoblinTrapperFollower();
        });
        
        // Add debug key for Shaman follower
        this.shamanKey = this.input.keyboard.addKey('H');
        this.input.keyboard.on('keydown-H', () => {
            console.log('H key pressed - creating Shaman follower');
            this.addShamanFollower();
        });
        
        // Add debug key for Holy Bard follower
        this.holyBardKey = this.input.keyboard.addKey('B');
        this.input.keyboard.on('keydown-B', () => {
            console.log('B key pressed - creating Holy Bard follower');
            this.addHolyBardFollower();
        });
        
        // Add debug key for Shroom Pixie follower
        this.shroomPixieKey = this.input.keyboard.addKey('P');
        this.input.keyboard.on('keydown-P', () => {
            console.log('P key pressed - creating Shroom Pixie follower');
            this.addShroomPixieFollower();
        });
        
        // Add debug keys for spawning bosses (1-4)
        this.input.keyboard.on('keydown-ONE', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Spawning Stage 1 Boss (Summoner)');
                this.spawnSystem.spawnBoss(1);
            }
        });
        
        this.input.keyboard.on('keydown-TWO', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Spawning Stage 2 Boss (Berserker)');
                this.spawnSystem.spawnBoss(2);
            }
        });
        
        this.input.keyboard.on('keydown-THREE', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Spawning Stage 3 Boss (Mad Alchemist)');
                this.spawnSystem.spawnBoss(3);
            }
        });
        
        this.input.keyboard.on('keydown-FOUR', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Spawning Stage 4 Boss (Lich King)');
                this.spawnSystem.spawnBoss(4);
            }
        });
        
        // Listen for game pause
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.gameActive && !this.gameOver) {
                console.log('Game paused');
                this.scene.pause();
                if (this.uiManager) this.uiManager.showPauseMenu();
            }
        });
        
        // Listen for pointer events
        this.input.on('pointerdown', (pointer) => {
            if (!this.player || !this.gameActive || this.gameOver) return;
            
            // Get target position in world coordinates, accounting for camera
            const targetPosition = new Phaser.Math.Vector2(
                pointer.worldX,
                pointer.worldY
            );
            
            if (pointer.leftButtonDown()) {
                // Left click for basic attack
                this.player.performBasicAttack(targetPosition);
            } else if (pointer.rightButtonDown()) {
                // Right click for special attack
                this.player.useSpecialAttack(this.enemies, this.helpers);
            }
        });
    }
    
    /**
     * Create and initialize all game systems
     */
    createSystems() {
        // Create follower factory
        this.followerFactory = new FollowerFactory(this);
        
        // Create movement system
        this.movementSystem = new MovementSystem(this);
        
        // Create UI manager first so the background is created
        this.uiManager = new UIManager(this);
        
        // Create spawn system
        this.spawnSystem = new SpawnSystem(this);
        
        // Initialize wave information in the UI
        if (this.uiManager && this.spawnSystem) {
            this.uiManager.updateWaveInfo(
                this.spawnSystem.currentWave,
                this.spawnSystem.totalWaves,
                0,  // No enemies yet
                0   // No enemies yet
            );
        }
        
        // Create combat system
        this.combatSystem = new CombatSystem(this);
        
        // Create level system after UI manager (to appear on top of the UI background)
        this.levelSystem = new LevelSystem(this);
        this.levelSystem.createUI();
        this.currentLevel = this.levelSystem.currentLevel; // Sync current level
        
        // Initialize audio manager if it doesn't exist
        if (!this.audioManager) {
            console.log('Creating AudioManager in createSystems');
            this.audioManager = new AudioManager(this);
            this.audioManager.init();
        }
    }
    
    /**
     * Set up UI elements
     */
    setupUI() {
        // Create the UI elements with a consistent depth
        const uiDepth = 100;
        
        // Position values for the right side of the screen
        const rightPadding = GAME_WIDTH - 220;
        
        // Generate healthbar graphics procedurally instead of loading images
        // Background bar (dark gray)
        this.healthBarBg = this.add.graphics();
        this.healthBarBg.fillStyle(0x333333, 1);
        this.healthBarBg.fillRect(rightPadding, 20, 200, 20);
        this.healthBarBg.lineStyle(2, 0x555555, 1);
        this.healthBarBg.strokeRect(rightPadding, 20, 200, 20);
        this.healthBarBg.setScrollFactor(0);
        this.healthBarBg.setDepth(uiDepth);
        
        // Health fill (green)
        this.healthBarFill = this.add.graphics();
        this.healthBarFill.fillStyle(0x00ff00, 1);
        this.healthBarFill.fillRect(rightPadding, 20, 200, 20);
        this.healthBarFill.setScrollFactor(0);
        this.healthBarFill.setDepth(uiDepth);
        
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
        
        // Health display - positioned to the left of the health bar
        this.healthText = this.add.text(
            rightPadding - 10, 
            20, 
            'Health: 0/0', 
            {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#00ff00',
                stroke: '#000000',
                strokeThickness: 3
            }
        )
        .setScrollFactor(0)
        .setDepth(uiDepth)
        .setOrigin(1, 0.5); // Right-aligned, vertically centered
        
        // Update health display initially
        this.updateHealthDisplay();
    }
    
    /**
     * Update health display text and bar
     */
    updateHealthDisplay() {
        if (this.player && this.healthText) {
            // Position values for the right side of the screen
            const rightPadding = GAME_WIDTH - 220;
            
            // Update text
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
            
            // Update health bar fill
            if (this.healthBarFill) {
                this.healthBarFill.clear();
                this.healthBarFill.fillStyle(parseInt(color.replace('#', '0x')), 1);
                const fillWidth = Math.max(0, Math.min(200 * healthPercent, 200));
                this.healthBarFill.fillRect(rightPadding, 20, fillWidth, 20);
            }
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
        this.movementSystem.update(time, delta);
        
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
        this.movementSystem.handleInput(this.cursorKeys);

        // Special Attack
        if (Phaser.Input.Keyboard.JustDown(this.wasd.special)) {
             this.useSpecialAttack();
        }
        
        // Basic Attack (Keyboard)
        if (Phaser.Input.Keyboard.JustDown(this.wasd.attack)) {
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
     * Create a poison cloud (delegates to helper but adds pooling)
     */
    createPoisonCloud(x, y, radius) {
        // If we have a resource manager, use it for particle emitters
        if (this.resourceManager) {
            return this.helpers.createPoisonCloudPooled(this, x, y, radius, this.resourceManager);
        } else {
            return this.helpers.createPoisonCloud(this, x, y, radius);
        }
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
        // If we have a resource manager, use it for graphics objects
        if (this.resourceManager) {
            return this.helpers.createTimedExplosionPooled(this, x, y, radius, delay, damage, this.resourceManager);
        } else {
            return this.helpers.createTimedExplosion(this, x, y, radius, delay, damage);
        }
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
        
        // Update background image for the current level
        this.updateBackgroundForLevel(level);
        
        // Adjust game difficulty based on level
        this.spawnSystem.adjustEnemySpawnRate(level);
    }

    /**
     * Start level music
     */
    startLevelMusic() {
        // If audio manager isn't initialized, try to initialize it
        if (!this.audioManager) {
            console.log('AudioManager not found, attempting to initialize...');
            try {
                this.audioManager = new AudioManager(this);
                this.audioManager.init();
            } catch (error) {
                console.error('Failed to initialize AudioManager:', error);
                return;
            }
        }
        
        if (!this.audioManager.initialized) {
            console.warn('Cannot play level music - audio manager not fully initialized');
            return;
        }
        
        console.log(`Starting level music for level ${this.currentLevel}`);
        
        try {
            // Use the proper method to play level-based music
            this.audioManager.playLevelBGM(this.currentLevel);
        } catch (error) {
            console.warn('Error playing level BGM:', error);
        }
    }

    /**
     * Update the background image based on the current level/stage
     * @param {number} level - Current game level
     */
    updateBackgroundForLevel(level) {
        // Directly use imported constants
        
        // Determine which background to use based on level
        let backgroundKey = 'gamemap_01';
        
        if (level >= 16) {
            backgroundKey = 'gamemap_04';  // Stage 4 (levels 16+)
        } else if (level >= 11) {
            backgroundKey = 'gamemap_03';  // Stage 3 (levels 11-15)
        } else if (level >= 6) {
            backgroundKey = 'gamemap_02';  // Stage 2 (levels 6-10)
        }
        
        console.log(`Setting background for level ${level}: ${backgroundKey}`);
        
        // Remove previous background if it exists
        if (this.background) {
            this.background.destroy();
        }
        
        // Create new background with appropriate image
        this.background = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, backgroundKey);
        this.background.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
        this.background.setDepth(-10); // Set a negative depth to ensure it renders below terrain
    }

    /**
     * Add a test Chronotemporal follower for animation testing
     */
    addChronotemporalFollower() {
        console.log('Adding Chronotemporal engineer follower for testing');
        
        // Get the Chronotemporal class data
        const chronotemporalClass = this.engineerClasses.chronotemporal;
        
        if (!chronotemporalClass) {
            console.error('Chronotemporal class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Chronotemporal')) {
            const texture = this.textures.get('Chronotemporal');
            console.log('Chronotemporal texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Chronotemporal texture not found!');
        }
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(chronotemporalClass);
        
        if (follower) {
            console.log('Successfully created Chronotemporal follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Chronotemporal follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
                
                // Extra test specifically for left animation
                this.time.delayedCall(6000, () => {
                    console.log('Extra test for LEFT animation with forced frame:');
                    follower.setFlipX(false);
                    follower.setFlipY(false);
                    follower.angle = 0;
                    follower.direction = 'left';
                    follower.playAnimation('left');
                    
                    // Also test manual frame setting
                    this.time.delayedCall(500, () => {
                        console.log('Setting LEFT animation frames directly (4-7)');
                        follower.setFrame(4);
                        
                        // Cycle through all left frames
                        [5, 6, 7, 4].forEach((frame, i) => {
                            this.time.delayedCall(300 + 300 * i, () => {
                                console.log(`Setting frame ${frame} manually`);
                                follower.setFrame(frame);
                            });
                        });
                    });
                });
            });
        } else {
            console.error('Failed to create Chronotemporal follower');
        }
        
        return follower;
    }

    /**
     * Add a test Voltaic follower for animation testing
     */
    addVoltaicFollower() {
        console.log('Adding Voltaic engineer follower for testing');
        
        // Get the Voltaic class data
        const voltaicClass = this.engineerClasses.voltaic;
        
        if (!voltaicClass) {
            console.error('Voltaic class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Voltaic')) {
            const texture = this.textures.get('Voltaic');
            console.log('Voltaic texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Voltaic texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Voltaic', 'assets/images/characters/Voltaic.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Voltaic texture on demand');
                this.createVoltaicFollower();
            });
            
            this.load.start();
            return;
        }
        
        return this.createVoltaicFollower();
    }
    
    /**
     * Create a Voltaic follower once the texture is loaded
     * @private
     */
    createVoltaicFollower() {
        // Get the Voltaic class data
        const voltaicClass = this.engineerClasses.voltaic;
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(voltaicClass);
        
        if (follower) {
            console.log('Successfully created Voltaic follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Voltaic follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
                
                // Extra test specifically for right animation (the one with the frame issue in JSON)
                this.time.delayedCall(6000, () => {
                    console.log('Extra test for RIGHT animation with fixed frames:');
                    follower.setFlipX(false);
                    follower.setFlipY(false);
                    follower.angle = 0;
                    follower.direction = 'right';
                    follower.playAnimation('right');
                });
            });
        } else {
            console.error('Failed to create Voltaic follower');
        }
        
        return follower;
    }

    /**
     * Add a test Thunder Mage follower for animation testing
     */
    addThunderMageFollower() {
        console.log('Adding Thunder Mage engineer follower for testing');
        
        // Get the Thunder Mage class data
        const thunderMageClass = this.engineerClasses.thunderMage;
        
        if (!thunderMageClass) {
            console.error('Thunder Mage class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Thunder Mage')) {
            const texture = this.textures.get('Thunder Mage');
            console.log('Thunder Mage texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Thunder Mage texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Thunder Mage', 'assets/images/characters/Thunder Mage.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Thunder Mage texture on demand');
                this.createThunderMageFollower();
            });
            
            this.load.start();
            return;
        }
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(thunderMageClass);
        
        if (follower) {
            console.log('Successfully created Thunder Mage follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Thunder Mage follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
            });
        } else {
            console.error('Failed to create Thunder Mage follower');
        }
        
        return follower;
    }
    
    /**
     * Create a Thunder Mage follower (called when texture is loaded on-demand)
     */
    createThunderMageFollower() {
        if (this.engineerClasses.thunderMage) {
            const follower = this.combatSystem.createClassFollower(this.engineerClasses.thunderMage);
            if (follower) {
                console.log('Created Thunder Mage follower after on-demand texture load');
                
                // Set scale and depth
                follower.setScale(0.75);
                follower.setDepth(10);
                
                // Set default animation
                follower.direction = 'down';
                follower.playAnimation('down');
                
                return follower;
            }
        }
        return null;
    }

    /**
     * Add a test Sniper follower for animation testing
     */
    addSniperFollower() {
        console.log('Adding Sniper engineer follower for testing');
        
        // Get the Sniper class data
        const sniperClass = this.engineerClasses.sniper;
        
        if (!sniperClass) {
            console.error('Sniper class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Sniper')) {
            const texture = this.textures.get('Sniper');
            console.log('Sniper texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Sniper texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Sniper', 'assets/images/characters/Sniper.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Sniper texture on demand');
                this.createSniperFollower();
            });
            
            this.load.start();
            return;
        }
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(sniperClass);
        
        if (follower) {
            console.log('Successfully created Sniper follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Sniper follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
            });
        } else {
            console.error('Failed to create Sniper follower');
        }
        
        return follower;
    }
    
    /**
     * Create a Sniper follower (called when texture is loaded on-demand)
     */
    createSniperFollower() {
        if (this.engineerClasses.sniper) {
            const follower = this.combatSystem.createClassFollower(this.engineerClasses.sniper);
            if (follower) {
                console.log('Created Sniper follower after on-demand texture load');
                
                // Set scale and depth
                follower.setScale(0.75);
                follower.setDepth(10);
                
                // Set default animation
                follower.direction = 'down';
                follower.playAnimation('down');
                
                return follower;
            }
        }
        return null;
    }

    /**
     * Add a test Dark Mage follower for animation testing
     */
    addDarkMageFollower() {
        console.log('Adding Dark Mage engineer follower for testing');
        
        // Get the Dark Mage class data
        const darkMageClass = this.engineerClasses.darkMage;
        
        if (!darkMageClass) {
            console.error('Dark Mage class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Dark Mage')) {
            const texture = this.textures.get('Dark Mage');
            console.log('Dark Mage texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Dark Mage texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Dark Mage', 'assets/images/characters/Dark Mage.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Dark Mage texture on demand');
                this.createDarkMageFollower();
            });
            
            this.load.start();
            return;
        }
        
        return this.createDarkMageFollower();
    }
    
    /**
     * Create a Dark Mage follower once the texture is loaded
     * @private
     */
    createDarkMageFollower() {
        // Get the Dark Mage class data
        const darkMageClass = this.engineerClasses.darkMage;
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(darkMageClass);
        
        if (follower) {
            console.log('Successfully created Dark Mage follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Dark Mage follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
            });
        } else {
            console.error('Failed to create Dark Mage follower');
        }
        
        return follower;
    }

    /**
     * Add a test Ninja follower for animation testing
     */
    addNinjaFollower() {
        console.log('Adding Ninja engineer follower for testing');
        
        // Get the Ninja class data
        const ninjaClass = this.engineerClasses.ninja;
        
        if (!ninjaClass) {
            console.error('Ninja class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Ninja')) {
            const texture = this.textures.get('Ninja');
            console.log('Ninja texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Ninja texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Ninja', 'assets/images/characters/Ninja.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Ninja texture on demand');
                this.createNinjaFollower();
            });
            
            this.load.start();
            return;
        }
        
        return this.createNinjaFollower();
    }
    
    /**
     * Create a Ninja follower once the texture is loaded
     * @private
     */
    createNinjaFollower() {
        // Get the Ninja class data
        const ninjaClass = this.engineerClasses.ninja;
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(ninjaClass);
        
        if (follower) {
            console.log('Successfully created Ninja follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Ninja follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
            });
        } else {
            console.error('Failed to create Ninja follower');
        }
        
        return follower;
    }

    /**
     * Add a test Shotgunner follower for animation testing
     */
    addShotgunnerFollower() {
        console.log('Adding Shotgunner engineer follower for testing');
        
        // Get the Shotgunner class data
        const shotgunnerClass = this.engineerClasses.shotgunner;
        
        if (!shotgunnerClass) {
            console.error('Shotgunner class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Shotgunner')) {
            const texture = this.textures.get('Shotgunner');
            console.log('Shotgunner texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Shotgunner texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Shotgunner', 'assets/images/characters/Shotgunner.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Shotgunner texture on demand');
                this.createShotgunnerFollower();
            });
            
            this.load.start();
            return;
        }
        
        return this.createShotgunnerFollower();
    }
    
    /**
     * Create a Shotgunner follower once the texture is loaded
     * @private
     */
    createShotgunnerFollower() {
        // Get the Shotgunner class data
        const shotgunnerClass = this.engineerClasses.shotgunner;
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(shotgunnerClass);
        
        if (follower) {
            console.log('Successfully created Shotgunner follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Shotgunner follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
            });
        } else {
            console.error('Failed to create Shotgunner follower');
        }
        
        return follower;
    }

    /**
     * Add a test Goblin Trapper follower for animation testing
     */
    addGoblinTrapperFollower() {
        console.log('Adding Goblin Trapper engineer follower for testing');
        
        // Get the Goblin Trapper class data
        const goblinTrapperClass = this.engineerClasses.goblinTrapper;
        
        if (!goblinTrapperClass) {
            console.error('Goblin Trapper class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Goblin Trapper')) {
            const texture = this.textures.get('Goblin Trapper');
            console.log('Goblin Trapper texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Goblin Trapper texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Goblin Trapper', 'assets/images/characters/Goblin Trapper.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Goblin Trapper texture on demand');
                this.createGoblinTrapperFollower();
            });
            
            this.load.start();
            return;
        }
        
        return this.createGoblinTrapperFollower();
    }
    
    /**
     * Create a Goblin Trapper follower once the texture is loaded
     * @private
     */
    createGoblinTrapperFollower() {
        // Get the Goblin Trapper class data
        const goblinTrapperClass = this.engineerClasses.goblinTrapper;
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(goblinTrapperClass);
        
        if (follower) {
            console.log('Successfully created Goblin Trapper follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Goblin Trapper follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
            });
        } else {
            console.error('Failed to create Goblin Trapper follower');
        }
        
        return follower;
    }

    /**
     * Add a test Shaman follower for animation testing
     */
    addShamanFollower() {
        console.log('Adding Shaman engineer follower for testing');
        
        // Get the Shaman class data
        const shamanClass = this.engineerClasses.shaman;
        
        if (!shamanClass) {
            console.error('Shaman class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Shaman')) {
            const texture = this.textures.get('Shaman');
            console.log('Shaman texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Shaman texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Shaman', 'assets/images/characters/Shaman.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Shaman texture on demand');
                this.createShamanFollower();
            });
            
            this.load.start();
            return;
        }
        
        return this.createShamanFollower();
    }
    
    /**
     * Create a Shaman follower once the texture is loaded
     * @private
     */
    createShamanFollower() {
        // Get the Shaman class data
        const shamanClass = this.engineerClasses.shaman;
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(shamanClass);
        
        if (follower) {
            console.log('Successfully created Shaman follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Shaman follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
            });
        } else {
            console.error('Failed to create Shaman follower');
        }
        
        return follower;
    }

    /**
     * Add a test Holy Bard follower for animation testing
     */
    addHolyBardFollower() {
        console.log('Adding Holy Bard engineer follower for testing');
        
        // Get the Holy Bard class data
        const holyBardClass = this.engineerClasses.holyBard;
        
        if (!holyBardClass) {
            console.error('Holy Bard class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Holy Bard')) {
            const texture = this.textures.get('Holy Bard');
            console.log('Holy Bard texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Holy Bard texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Holy Bard', 'assets/images/characters/Holy Bard.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Holy Bard texture on demand');
                this.createHolyBardFollower();
            });
            
            this.load.start();
            return;
        }
        
        return this.createHolyBardFollower();
    }
    
    /**
     * Create a Holy Bard follower once the texture is loaded
     * @private
     */
    createHolyBardFollower() {
        // Get the Holy Bard class data
        const holyBardClass = this.engineerClasses.holyBard;
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(holyBardClass);
        
        if (follower) {
            console.log('Successfully created Holy Bard follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Holy Bard follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
            });
        } else {
            console.error('Failed to create Holy Bard follower');
        }
        
        return follower;
    }

    /**
     * Add a test Shroom Pixie follower for animation testing
     */
    addShroomPixieFollower() {
        console.log('Adding Shroom Pixie engineer follower for testing');
        
        // Get the Shroom Pixie class data
        const shroomPixieClass = this.engineerClasses.shroomPixie;
        
        if (!shroomPixieClass) {
            console.error('Shroom Pixie class not found in engineerClasses!');
            return;
        }
        
        // Debug the texture to make sure it loaded properly
        if (this.textures.exists('Shroom Pixie')) {
            const texture = this.textures.get('Shroom Pixie');
            console.log('Shroom Pixie texture info:', {
                key: texture.key,
                frameTotal: texture.frameTotal,
                firstFrame: texture.get(0),
                frames: Array.from({length: Math.min(texture.frameTotal, 16)}, (_, i) => i)
            });
        } else {
            console.error('Shroom Pixie texture not found!');
            
            // Try to load the texture on-demand if it's missing
            this.load.spritesheet('Shroom Pixie', 'assets/images/characters/Shroom Pixie.png', {
                frameWidth: 96,
                frameHeight: 96,
                margin: 0,
                spacing: 0
            });
            
            // Start loading and create the follower when ready
            this.load.once('complete', () => {
                console.log('Loaded Shroom Pixie texture on demand');
                this.createShroomPixieFollower();
            });
            
            this.load.start();
            return;
        }
        
        return this.createShroomPixieFollower();
    }
    
    /**
     * Create a Shroom Pixie follower once the texture is loaded
     * @private
     */
    createShroomPixieFollower() {
        // Get the Shroom Pixie class data
        const shroomPixieClass = this.engineerClasses.shroomPixie;
        
        // Use the combat system to create the engineer follower
        const follower = this.combatSystem.createClassFollower(shroomPixieClass);
        
        if (follower) {
            console.log('Successfully created Shroom Pixie follower with animations');
            
            // Set appropriate scale and depth
            follower.setScale(0.75);
            follower.setDepth(10);
            
            // Force angle to 0 to prevent upside-down sprites
            follower.angle = 0;
            
            // Debug check all directions
            this.time.delayedCall(500, () => {
                console.log('Testing Shroom Pixie follower animations');
                
                // Force it to use down animation for testing
                follower.direction = 'down';
                follower.playAnimation('down');
                
                // Then after a delay, try each direction sequentially
                const testDirections = ['down', 'left', 'right', 'up'];
                testDirections.forEach((dir, i) => {
                    this.time.delayedCall(1000 + 1000 * i, () => {
                        console.log(`Testing ${dir} animation`);
                        follower.setFlipX(false);
                        follower.setFlipY(false);
                        follower.angle = 0;
                        follower.direction = dir;
                        follower.playAnimation(dir);
                    });
                });
            });
        } else {
            console.error('Failed to create Shroom Pixie follower');
        }
        
        return follower;
    }

    /**
     * Clean up resources on scene shutdown
     */
    shutdown() {
        super.shutdown();
        
        // Clean up pooled resources
        if (this.resourceManager) {
            console.log('Cleaning up resource manager pools');
            this.resourceManager.cleanup();
        }
    }
} 