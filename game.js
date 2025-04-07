// Pixel Art Snake + Vampire Survivor Game (Nimble Quest style)
console.log('game.js file loaded!');

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PIXEL_SIZE = 4; // Base pixel size for art
const TILE_SIZE = 16; // Size of each tile in the game grid

// Game state variables
let player; // The player (snake head)
let followers = []; // Snake followers
let enemies = []; // Enemy group
let pickups = []; // Powerups and collectibles
let bullets = []; // Projectiles
let engineers = []; // Engineers to collect
let cursors; // Keyboard controls
let direction = 'right'; // Current direction
let nextDirection = 'right'; // Next direction
let moveTimer = 0; // Last time the snake moved
let moveDelay = 150; // Time between moves in ms
let score = 0;
let scoreText;
let gameOver = false;
let gameActive = true;
let specialAttackKey;
let specialAttackCooldown = 0;
let specialAttackCooldownMax = 3000; // ms
let skillButton;
let skillCooldownIndicator;
let selectedHero = 'warrior';
let currentLevel = 1;
let levelText;
let experienceToNextLevel = 100;
let experience = 0;
let experienceBar;
let specialCooldownBar;
let cooldownText;
let heroText;

// Hero classes with different abilities
const heroClasses = {
    warrior: {
        name: 'Warrior',
        color: 0x00FFFF,
        specialAttack: function(scene) {
            // Sword sweep (damages all nearby enemies)
            const range = TILE_SIZE * 3;
            let enemiesHit = 0;
            
            for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
                
                if (distance <= range) {
                    createExplosion(scene, enemy.x, enemy.y, 0xFFFF00);
                    enemy.destroy();
                    enemies.splice(i, 1);
                    i--;
                    enemiesHit++;
                    
                    // Increase score
                    score += 5;
                }
            }
            
            // Visual effect for sword sweep
            const sweep = scene.add.graphics();
            sweep.fillStyle(0xFFFF00, 0.3);
            sweep.fillCircle(player.x, player.y, range);
            
            // Fade out and destroy
            scene.tweens.add({
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
        specialAttack: function(scene) {
            // Fire arrows in 8 directions
            const directions = [
                {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
                {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
            ];
            
            directions.forEach(dir => {
                shootProjectile(scene, player.x, player.y, dir.x, dir.y, 'arrow');
            });
            
            return true;
        }
    },
    mage: {
        name: 'Mage',
        color: 0xFF00FF,
        specialAttack: function(scene) {
            // Freeze all enemies temporarily
            if (enemies.length === 0) return false;
            
            enemies.forEach(enemy => {
                // Visual effect
                enemy.setTint(0x00FFFF);
                
                // Store original velocity
                enemy.originalVelocity = {
                    x: enemy.body.velocity.x,
                    y: enemy.body.velocity.y
                };
                
                // Stop enemy
                enemy.body.velocity.x = 0;
                enemy.body.velocity.y = 0;
                
                // Unfreeze after a delay
                scene.time.delayedCall(2000, () => {
                    if (enemy.active) {
                        enemy.clearTint();
                        // Restore original movement toward player
                        scene.physics.moveToObject(enemy, player, 50);
                    }
                });
            });
            
            return true;
        }
    }
};

// Current hero class (default to warrior)
let currentHeroClass = heroClasses.warrior;

// Create all game textures during preload
function createGameTextures(scene) {
    console.log('Creating game textures...');
    
    // Create a pixel texture for particles
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 4;
    particleCanvas.height = 4;
    const particleCtx = particleCanvas.getContext('2d');
    particleCtx.fillStyle = '#FFFFFF';
    particleCtx.fillRect(0, 0, 4, 4);
    
    // Create basic shapes for the game
    scene.textures.addBase64('particle', particleCanvas.toDataURL());
    
    // Create player texture
    const playerCanvas = document.createElement('canvas');
    playerCanvas.width = TILE_SIZE;
    playerCanvas.height = TILE_SIZE;
    const playerCtx = playerCanvas.getContext('2d');
    playerCtx.fillStyle = '#00FFFF'; // Default color (will be tinted later)
    playerCtx.fillRect(2, 2, TILE_SIZE-4, TILE_SIZE-4);
    // Add eyes
    playerCtx.fillStyle = '#000000';
    playerCtx.fillRect(TILE_SIZE*0.6, TILE_SIZE*0.3, 3, 3);
    playerCtx.fillRect(TILE_SIZE*0.6, TILE_SIZE*0.7, 3, 3);
    scene.textures.addBase64('player', playerCanvas.toDataURL());
    
    // Create follower texture
    const followerCanvas = document.createElement('canvas');
    followerCanvas.width = TILE_SIZE;
    followerCanvas.height = TILE_SIZE;
    const followerCtx = followerCanvas.getContext('2d');
    // Draw circle
    followerCtx.fillStyle = '#00FFFF'; // Default color (will be tinted later)
    followerCtx.beginPath();
    followerCtx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/2-2, 0, Math.PI*2);
    followerCtx.fill();
    scene.textures.addBase64('follower', followerCanvas.toDataURL());
    
    // Create enemy texture
    const enemyCanvas = document.createElement('canvas');
    enemyCanvas.width = TILE_SIZE;
    enemyCanvas.height = TILE_SIZE;
    const enemyCtx = enemyCanvas.getContext('2d');
    // Draw spiky enemy
    enemyCtx.fillStyle = '#FF0000'; // Default color (will be tinted later)
    enemyCtx.beginPath();
    const spikes = 8;
    const centerX = TILE_SIZE/2;
    const centerY = TILE_SIZE/2;
    const outerRadius = TILE_SIZE/2-2;
    const innerRadius = TILE_SIZE/4;
    
    for(let i = 0; i < spikes*2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI * 2 * i) / (spikes * 2);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (i === 0) {
            enemyCtx.moveTo(x, y);
        } else {
            enemyCtx.lineTo(x, y);
        }
    }
    enemyCtx.closePath();
    enemyCtx.fill();
    scene.textures.addBase64('enemy', enemyCanvas.toDataURL());
    
    // Create pickup texture
    const pickupCanvas = document.createElement('canvas');
    pickupCanvas.width = TILE_SIZE;
    pickupCanvas.height = TILE_SIZE;
    const pickupCtx = pickupCanvas.getContext('2d');
    // Draw shiny circle
    pickupCtx.fillStyle = '#FFFF00';
    pickupCtx.beginPath();
    pickupCtx.arc(TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE/3, 0, Math.PI*2);
    pickupCtx.fill();
    // Add shine
    pickupCtx.fillStyle = '#FFFFFF';
    pickupCtx.beginPath();
    pickupCtx.arc(TILE_SIZE/3, TILE_SIZE/3, TILE_SIZE/8, 0, Math.PI*2);
    pickupCtx.fill();
    scene.textures.addBase64('pickup', pickupCanvas.toDataURL());
    
    // Create bullet texture
    const bulletCanvas = document.createElement('canvas');
    bulletCanvas.width = TILE_SIZE/2;
    bulletCanvas.height = TILE_SIZE/2;
    const bulletCtx = bulletCanvas.getContext('2d');
    bulletCtx.fillStyle = '#FFFF00';
    bulletCtx.beginPath();
    bulletCtx.arc(TILE_SIZE/4, TILE_SIZE/4, TILE_SIZE/4-1, 0, Math.PI*2);
    bulletCtx.fill();
    scene.textures.addBase64('bullet', bulletCanvas.toDataURL());
    
    // Create arrow texture
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = TILE_SIZE;
    arrowCanvas.height = TILE_SIZE/2;
    const arrowCtx = arrowCanvas.getContext('2d');
    arrowCtx.strokeStyle = '#00FF00';
    arrowCtx.lineWidth = 2;
    arrowCtx.beginPath();
    arrowCtx.moveTo(0, TILE_SIZE/4);
    arrowCtx.lineTo(TILE_SIZE*0.7, TILE_SIZE/4);
    arrowCtx.moveTo(TILE_SIZE*0.7, 0);
    arrowCtx.lineTo(TILE_SIZE, TILE_SIZE/4);
    arrowCtx.lineTo(TILE_SIZE*0.7, TILE_SIZE/2);
    arrowCtx.stroke();
    scene.textures.addBase64('arrow', arrowCanvas.toDataURL());
    
    console.log('Game textures created successfully!');
}

// Forward declare scene classes
class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
        console.log('TitleScene constructor called');
    }
    
    preload() {
        console.log('TitleScene preload started');
        // Generate assets instead of loading them
        createGameTextures(this);
        console.log('TitleScene assets created');
    }
    
    create() {
        console.log('TitleScene create started');
        // Title text
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 4, 'SNAKE SURVIVORS', {
            fontSize: '48px',
            fontFamily: 'Arial',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // Character selection text
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'Choose Your Character:', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Create character selection buttons
        const characters = [
            { name: 'Warrior', color: 0xFF0000, desc: 'Sword sweep: damages nearby enemies' },
            { name: 'Archer', color: 0x00FF00, desc: 'Multi-shot: fires arrows in all directions' },
            { name: 'Mage', color: 0x00FFFF, desc: 'Frost Nova: freezes nearby enemies' }
        ];
        
        characters.forEach((char, index) => {
            // Calculate position
            const x = GAME_WIDTH / 2;
            const y = GAME_HEIGHT / 2 + index * 80;
            
            // Create button background
            const buttonBg = this.add.rectangle(x, y, 300, 60, 0x333333, 0.8)
                .setOrigin(0.5);
            
            // Create character icon
            const icon = this.add.rectangle(x - 120, y, 40, 40, char.color)
                .setOrigin(0.5);
            
            // Create character name
            const nameText = this.add.text(x - 80, y - 15, char.name, {
                fontSize: '24px',
                fontFamily: 'Arial',
                fill: '#FFFFFF'
            }).setOrigin(0, 0.5);
            
            // Create character description
            const descText = this.add.text(x - 80, y + 15, char.desc, {
                fontSize: '14px',
                fontFamily: 'Arial',
                fill: '#CCCCCC'
            }).setOrigin(0, 0.5);
            
            // Make button interactive
            buttonBg.setInteractive({ useHandCursor: true })
                .on('pointerover', () => buttonBg.setFillStyle(0x555555, 0.8))
                .on('pointerout', () => buttonBg.setFillStyle(0x333333, 0.8))
                .on('pointerdown', () => {
                    console.log('Character selected:', char.name);
                    // Set selected character and start game
                    selectedHero = char.name.toLowerCase();
                    this.scene.start('GameScene');
                });
        });
        console.log('TitleScene create completed');
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        console.log('GameScene constructor called');
    }
    
    preload() {
        console.log('GameScene preload started');
        // Use asset generator instead of base64 images
        createGameTextures(this);
        console.log('GameScene assets created');
    }
    
    create() {
        console.log('GameScene create started');
        // Reset game state
        gameOver = false;
        gameActive = true;
        score = 0;
        direction = 'right';
        nextDirection = 'right';
        moveTimer = 0;
        followers = [];
        enemies = [];
        pickups = [];
        bullets = [];
        engineers = [];
        currentLevel = 1;
        experience = 0;
        experienceToNextLevel = 100;
        
        // Set the hero class based on selection
        switch (selectedHero) {
            case 'warrior':
                currentHeroClass = heroClasses.warrior;
                break;
            case 'archer':
                currentHeroClass = heroClasses.archer;
                break;
            case 'mage':
                currentHeroClass = heroClasses.mage;
                break;
        }
        console.log('Selected hero:', selectedHero, 'Hero class:', currentHeroClass.name);
        
        // Create player (snake head)
        player = this.physics.add.sprite(
            Math.floor(GAME_WIDTH / 2 / TILE_SIZE) * TILE_SIZE,
            Math.floor(GAME_HEIGHT / 2 / TILE_SIZE) * TILE_SIZE,
            'player'
        );
        player.setTint(currentHeroClass.color);
        player.health = 50; // Commander starts with 50 health
        player.maxHealth = 50;
        
        // Create health bar for player
        player.healthBar = this.add.graphics();
        updateHealthBar(this, player);
        
        console.log('Player created at:', player.x, player.y);
        
        // Set snake head rotation based on direction
        switch (direction) {
            case 'left':
                player.angle = 180;
                break;
            case 'right':
                player.angle = 0;
                break;
            case 'up':
                player.angle = 270;
                break;
            case 'down':
                player.angle = 90;
                break;
        }
        
        // Setup keyboard input
        cursors = this.input.keyboard.createCursorKeys();
        // Add WASD keys
        cursors.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        cursors.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        cursors.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        cursors.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        specialAttackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Add basic attack key (right mouse button)
        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                performBasicAttack(this, pointer);
            }
        });
        
        // Add Q key for basic attack when mouse isn't available
        const basicAttackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        basicAttackKey.on('down', () => {
            // Get attack direction based on movement direction
            let targetX, targetY;
            switch(direction) {
                case 'right':
                    targetX = player.x + 100;
                    targetY = player.y;
                    break;
                case 'left':
                    targetX = player.x - 100;
                    targetY = player.y;
                    break;
                case 'up':
                    targetX = player.x;
                    targetY = player.y - 100;
                    break;
                case 'down':
                    targetX = player.x;
                    targetY = player.y + 100;
                    break;
            }
            
            // Create a mock pointer object
            const mockPointer = {
                worldX: targetX,
                worldY: targetY
            };
            performBasicAttack(this, mockPointer);
        });
        
        console.log('Input controls set up');
        
        // Add UI elements
        scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fill: '#fff'
        });
        scoreText.setDepth(10);
        
        // Create level display
        levelText = this.add.text(16, 48, 'Level: 1', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fill: '#fff'
        });
        levelText.setDepth(10);
        
        // Create hero class text
        heroText = this.add.text(16, 80, `Hero: ${currentHeroClass.name}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fill: '#fff'
        });
        heroText.setDepth(10);
        
        // Create experience bar
        const expBarBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH - 40, 16, 0x333333);
        expBarBg.setDepth(10);
        
        experienceBar = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 20, 0, 12, 0x00ff00);
        experienceBar.setDepth(11);
        
        // Create special attack cooldown indicator
        specialCooldownBar = this.add.rectangle(GAME_WIDTH - 110, 20, 100, 12, 0xff0000);
        specialCooldownBar.setDepth(11);
        
        // Add cooldown text
        cooldownText = this.add.text(GAME_WIDTH - 60, 40, 'READY', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: '#fff'
        });
        cooldownText.setOrigin(0.5);
        cooldownText.setDepth(11);
        
        // Add skill button (for mobile)
        skillButton = this.add.rectangle(GAME_WIDTH - 60, 20, 100, 24, 0x555555);
        skillButton.setInteractive();
        skillButton.on('pointerdown', () => {
            if (specialAttackCooldown <= 0) {
                useSpecialAttack(this);
            }
        });
        skillButton.setDepth(10);
        console.log('UI elements created');
        
        // Create first pickup
        spawnPickup(this);
        
        // Setup enemy spawning
        this.time.addEvent({
            delay: 2000,
            callback: () => spawnEnemy(this),
            loop: true
        });
        
        // Setup engineer spawning (every 10 seconds)
        this.time.addEvent({
            delay: 10000,
            callback: () => spawnEngineer(this),
            loop: true
        });
        
        // Setup special attack input
        this.input.keyboard.on('keydown-SPACE', () => {
            if (specialAttackCooldown <= 0) {
                useSpecialAttack(this);
            }
        });
        
        console.log('Game events initialized');
        console.log('GameScene create completed');
    }
    
    update(time, delta) {
        if (gameOver) return;
        
        // Handle input
        handleInput(this);
        
        // Move the snake periodically
        if (time > moveTimer) {
            moveSnake(this);
            moveTimer = time + moveDelay;
        }
        
        // Update enemies
        updateEnemies(this, delta);
        
        // Update bullets
        updateBullets(this, delta);
        
        // Update health bars for player and followers
        updateHealthBar(this, player);
        followers.forEach(follower => {
            if (follower.healthBar) {
                updateHealthBar(this, follower);
            }
        });
        
        // Update engineer followers' auto-attacks (Vampire Survivors style)
        followers.forEach(follower => {
            if (follower.engineerClass && enemies.length > 0) {
                // Decrease cooldown timer
                if (follower.specialAttackCooldown > 0) {
                    follower.specialAttackCooldown -= delta;
                }
                
                // If cooldown is complete, perform attack
                if (follower.specialAttackCooldown <= 0 && follower.active) {
                    // Execute special attack based on engineer class
                    const attackSuccess = follower.engineerClass.specialAttack(this, follower, enemies);
                    
                    if (attackSuccess) {
                        // Reset cooldown with slight randomness for more natural rhythm
                        const randomVariance = Phaser.Math.Between(-300, 300);
                        follower.specialAttackCooldown = follower.specialAttackCooldownMax + randomVariance;
                        
                        // Visual feedback for attack
                        this.tweens.add({
                            targets: follower,
                            scaleX: 1.2,
                            scaleY: 1.2,
                            duration: 100,
                            yoyo: true
                        });
                    }
                }
            }
        });
        
        // Check pickups
        this.physics.overlap(player, pickups, (player, pickup) => {
            collectPickup(this, pickup);
        });
        
        // Check engineers - need to check distance manually since engineers are not in a group
        engineers.forEach(engineer => {
            const distance = Phaser.Math.Distance.Between(
                player.x, player.y, engineer.x, engineer.y
            );
            
            if (distance < TILE_SIZE / 2) {
                collectEngineer(this, engineer);
            }
        });
        
        // The overlap handler now just triggers damage instead of immediate game over
        // The damageCharacter function will handle the game over if health reaches zero
        this.physics.overlap(player, enemies, (player, enemy) => {
            // Only damage if this enemy hasn't dealt damage recently
            if (!enemy.hasDealtDamage) {
                damageCharacter(this, player, 1);
                enemy.hasDealtDamage = true;
                
                // Reset the flag after a delay
                this.time.delayedCall(500, () => {
                    if (enemy.active) {
                        enemy.hasDealtDamage = false;
                    }
                });
            }
        });
        
        // Check boundaries
        if (player.x < 0 || player.x >= GAME_WIDTH || player.y < 0 || player.y >= GAME_HEIGHT) {
            handleGameOver(this);
        }
        
        // Update cooldown
        specialAttackCooldown = Math.max(0, specialAttackCooldown - delta);
        updateCooldownDisplay(this);
    }
}

// Steam Engineer classes with unique abilities
const engineerClasses = {
    chronotemporal: {
        name: 'Chronotemporal',
        color: 0xC78FFF, // Purple
        ability: 'Timeburst',
        description: 'Slows nearby enemies temporarily',
        specialAttack: function(scene, follower, enemies) {
            // Find enemies in range
            const range = TILE_SIZE * 4;
            let affected = 0;
            
            enemies.forEach(enemy => {
                const distance = Phaser.Math.Distance.Between(
                    follower.x, follower.y, enemy.x, enemy.y
                );
                
                if (distance <= range) {
                    // Slow down enemy
                    if (!enemy.isFrozen) {
                        enemy.setTint(0xAA88FF);
                        enemy.isFrozen = true;
                        
                        // Store original speed
                        if (!enemy.originalSpeed) {
                            enemy.originalSpeed = enemy.speed;
                        }
                        
                        // Slow by 70%
                        enemy.speed = enemy.originalSpeed * 0.3;
                        
                        // Create slow effect
                        const slowEffect = scene.add.particles('particle');
                        const emitter = slowEffect.createEmitter({
                            x: enemy.x,
                            y: enemy.y,
                            speed: { min: 20, max: 40 },
                            scale: { start: 0.4, end: 0 },
                            lifespan: 1000,
                            quantity: 1,
                            frequency: 100,
                            tint: 0xAA88FF
                        });
                        
                        // Follow enemy
                        scene.time.addEvent({
                            delay: 100,
                            callback: function() {
                                if (enemy.active && enemy.isFrozen) {
                                    emitter.setPosition(enemy.x, enemy.y);
                                } else {
                                    emitter.stop();
                                    scene.time.delayedCall(1000, () => {
                                        slowEffect.destroy();
                                    });
                                }
                            },
                            repeat: 20 // 2 seconds
                        });
                        
                        // Restore speed after delay
                        scene.time.delayedCall(2000, () => {
                            if (enemy.active) {
                                enemy.clearTint();
                                enemy.isFrozen = false;
                                enemy.speed = enemy.originalSpeed;
                            }
                        });
                        
                        affected++;
                    }
                }
            });
            
            // Visual effect
            if (affected > 0) {
                const timeEffect = scene.add.graphics();
                timeEffect.fillStyle(0xAA88FF, 0.3);
                timeEffect.fillCircle(follower.x, follower.y, range);
                
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
        specialAttack: function(scene, follower, enemies) {
            if (enemies.length === 0) return false;
            
            // Find closest enemy
            let closestEnemy = null;
            let minDistance = Number.MAX_VALUE;
            
            enemies.forEach(enemy => {
                const distance = Phaser.Math.Distance.Between(
                    follower.x, follower.y, enemy.x, enemy.y
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = enemy;
                }
            });
            
            if (minDistance > TILE_SIZE * 5 || !closestEnemy) return false;
            
            // Chain lightning effect to hit multiple enemies
            const maxChain = 3; // Max number of enemies to chain to
            const chainedEnemies = [closestEnemy];
            const lightning = [];
            
            // Create lightning to first enemy
            createLightningEffect(scene, follower.x, follower.y, closestEnemy.x, closestEnemy.y, lightning);
            
            // Damage first enemy
            damageEnemy(scene, closestEnemy, 1);
            
            // Find and chain to next enemies
            for (let i = 0; i < maxChain - 1 && chainedEnemies.length < maxChain; i++) {
                const source = chainedEnemies[chainedEnemies.length - 1];
                // Find next closest enemy that hasn't been chained to
                let nextEnemy = null;
                let nextMinDistance = Number.MAX_VALUE;
                
                enemies.forEach(enemy => {
                    if (chainedEnemies.includes(enemy)) return;
                    
                    const distance = Phaser.Math.Distance.Between(
                        source.x, source.y, enemy.x, enemy.y
                    );
                    
                    if (distance < nextMinDistance && distance < TILE_SIZE * 4) {
                        nextMinDistance = distance;
                        nextEnemy = enemy;
                    }
                });
                
                if (nextEnemy) {
                    // Create lightning effect
                    createLightningEffect(scene, source.x, source.y, nextEnemy.x, nextEnemy.y, lightning);
                    
                    // Damage enemy
                    damageEnemy(scene, nextEnemy, 1);
                    
                    // Add to chained enemies
                    chainedEnemies.push(nextEnemy);
                }
            }
            
            // Clean up lightning after a delay
            scene.time.delayedCall(500, () => {
                lightning.forEach(line => {
                    line.destroy();
                });
            });
            
            return true;
        }
    },
    iceMage: {
        name: 'Ice Mage',
        color: 0xB0E0E6, // Powder Blue
        ability: 'Frost Nova',
        description: 'Creates an expanding ring of ice that freezes enemies',
        specialAttack: function(scene, follower, enemies) {
            if (enemies.length === 0) return false;
            
            // Create expanding ice nova effect
            const novaRadius = TILE_SIZE * 5;
            let enemiesHit = 0;
            
            // Visual expanding circle effect
            const nova = scene.add.graphics();
            nova.fillStyle(0xB0E0E6, 0.3);
            nova.fillCircle(follower.x, follower.y, 10);
            
            // Animate expansion
            scene.tweens.add({
                targets: nova,
                scale: novaRadius / 10,
                duration: 500,
                onUpdate: () => {
                    // Check for enemies in the current radius
                    const currentRadius = 10 * nova.scale;
                    
                    enemies.forEach(enemy => {
                        if (enemy.frozenByNova) return; // Skip already frozen enemies
                        
                        const distance = Phaser.Math.Distance.Between(
                            follower.x, follower.y, enemy.x, enemy.y
                        );
                        
                        // Only freeze enemies at the edge of the expanding circle
                        if (Math.abs(distance - currentRadius) < 15) {
                            // Freeze enemy
                            enemy.frozenByNova = true;
                            enemy.setTint(0xB0E0E6);
                            
                            // Store original speed
                            if (!enemy.originalSpeed) {
                                enemy.originalSpeed = enemy.speed;
                            }
                            
                            // Stop enemy completely
                            enemy.body.velocity.x = 0;
                            enemy.body.velocity.y = 0;
                            enemy.speed = 0;
                            
                            // Create ice particles
                            const iceEffect = scene.add.particles('particle');
                            const emitter = iceEffect.createEmitter({
                                x: enemy.x,
                                y: enemy.y,
                                speed: { min: 10, max: 20 },
                                scale: { start: 0.5, end: 0 },
                                lifespan: 1000,
                                quantity: 1,
                                frequency: 200,
                                tint: 0xB0E0E6
                            });
                            
                            // Damage enemy
                            damageEnemy(scene, enemy, 1);
                            enemiesHit++;
                            
                            // Unfreeze after delay
                            scene.time.delayedCall(2500, () => {
                                if (enemy.active) {
                                    enemy.clearTint();
                                    enemy.frozenByNova = false;
                                    enemy.speed = enemy.originalSpeed;
                                }
                                
                                // Stop particles
                                emitter.stop();
                                scene.time.delayedCall(1000, () => {
                                    iceEffect.destroy();
                                });
                            });
                        }
                    });
                },
                onComplete: () => {
                    // Fade out and destroy
                    scene.tweens.add({
                        targets: nova,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => nova.destroy()
                    });
                }
            });
            
            return true;
        }
    },
    ninja: {
        name: 'Ninja',
        color: 0x696969, // Dark Gray
        ability: 'Gear Throw',
        description: 'Throws deadly spinning gears that pierce through enemies',
        specialAttack: function(scene, follower, enemies) {
            if (enemies.length === 0) return false;
            
            // Throw gears in 4 directions
            const directions = [
                { x: 1, y: 0 }, // right
                { x: -1, y: 0 }, // left
                { x: 0, y: 1 }, // down
                { x: 0, y: -1 } // up
            ];
            
            directions.forEach(dir => {
                // Create gear (using bullet texture for now)
                const gear = scene.physics.add.sprite(follower.x, follower.y, 'bullet');
                gear.setTint(0x696969);
                gear.setPipeline('Light2D'); // Add lighting effect if available
                gear.setScale(1.3);
                
                // Set velocity
                const speed = 250;
                gear.body.velocity.x = dir.x * speed;
                gear.body.velocity.y = dir.y * speed;
                
                // Add to bullets array
                bullets.push(gear);
                
                // Set properties for piercing
                gear.piercing = true;
                gear.pierceCount = 0;
                gear.maxPierces = 3;
                gear.damage = 2;
                gear.hitEnemies = []; // Track enemies hit to avoid hitting same enemy twice
                
                // Spin the gear
                scene.tweens.add({
                    targets: gear,
                    angle: 360,
                    duration: 1000,
                    repeat: -1,
                    ease: 'Linear'
                });
                
                // Add trail effect
                const trail = scene.add.particles('particle');
                const emitter = trail.createEmitter({
                    speed: 10,
                    scale: { start: 0.2, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 200,
                    tint: 0x696969
                });
                
                // Follow the gear
                scene.time.addEvent({
                    delay: 30,
                    callback: function() {
                        if (gear.active) {
                            emitter.setPosition(gear.x, gear.y);
                        } else {
                            emitter.stop();
                            scene.time.delayedCall(200, () => trail.destroy());
                        }
                    },
                    repeat: 40 // Follow for a while
                });
            });
            
            return true;
        }
    },
    holyBard: {
        name: 'Holy Bard',
        color: 0xFFD700, // Gold
        ability: 'Shrapnel Field',
        description: 'Creates a field of holy energy that damages enemies',
        specialAttack: function(scene, follower, enemies) {
            // Create field around follower
            const fieldRadius = TILE_SIZE * 3;
            const field = scene.add.graphics();
            field.fillStyle(0xFFD700, 0.3);
            field.fillCircle(follower.x, follower.y, fieldRadius);
            
            // Add pulsing effect
            scene.tweens.add({
                targets: field,
                alpha: 0.1,
                duration: 500,
                yoyo: true,
                repeat: 5,
                onComplete: () => field.destroy()
            });
            
            // Create particles in the field
            const particles = scene.add.particles('particle');
            const emitter = particles.createEmitter({
                x: follower.x,
                y: follower.y,
                speed: { min: 30, max: 70 },
                scale: { start: 0.4, end: 0 },
                lifespan: 1000,
                quantity: 2,
                frequency: 100,
                tint: 0xFFD700,
                emitZone: {
                    type: 'random',
                    source: new Phaser.Geom.Circle(0, 0, fieldRadius),
                    quantity: 12
                }
            });
            
            // Timer to damage enemies in field
            let tickCount = 0;
            const maxTicks = 6;
            
            const damageInterval = scene.time.addEvent({
                delay: 500, // Every half second
                callback: () => {
                    let enemiesHit = 0;
                    
                    // Damage enemies in field
                    enemies.forEach(enemy => {
                        const distance = Phaser.Math.Distance.Between(
                            follower.x, follower.y, enemy.x, enemy.y
                        );
                        
                        if (distance <= fieldRadius) {
                            // Apply damage
                            damageEnemy(scene, enemy, 1);
                            enemiesHit++;
                            
                            // Add visual effect on enemy
                            const flash = scene.add.sprite(enemy.x, enemy.y, 'particle')
                                .setTint(0xFFD700)
                                .setScale(1.5);
                                
                            scene.tweens.add({
                                targets: flash,
                                alpha: 0,
                                scale: 0.5,
                                duration: 300,
                                onComplete: () => flash.destroy()
                            });
                        }
                    });
                    
                    // Increment tick count
                    tickCount++;
                    if (tickCount >= maxTicks) {
                        damageInterval.remove();
                        emitter.stop();
                        scene.time.delayedCall(1000, () => particles.destroy());
                    }
                },
                callbackScope: scene,
                repeat: maxTicks - 1
            });
            
            return true;
        }
    },
    darkMage: {
        name: 'Dark Mage',
        color: 0x800080, // Purple
        ability: 'Aether Beam',
        description: 'Channels dark energy beams that damage all enemies in a line',
        specialAttack: function(scene, follower, enemies) {
            if (enemies.length === 0) return false;
            
            // Find closest enemy to target
            let closestEnemy = null;
            let minDistance = Number.MAX_VALUE;
            
            enemies.forEach(enemy => {
                const distance = Phaser.Math.Distance.Between(
                    follower.x, follower.y, enemy.x, enemy.y
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = enemy;
                }
            });
            
            if (!closestEnemy) return false;
            
            // Calculate beam angle
            const angle = Phaser.Math.Angle.Between(
                follower.x, follower.y,
                closestEnemy.x, closestEnemy.y
            );
            
            // Beam length
            const beamLength = GAME_WIDTH; // Long enough to go across screen
            
            // Calculate end point
            const endX = follower.x + Math.cos(angle) * beamLength;
            const endY = follower.y + Math.sin(angle) * beamLength;
            
            // Create beam graphics
            const beam = scene.add.graphics();
            beam.lineStyle(6, 0x800080, 0.8);
            beam.beginPath();
            beam.moveTo(follower.x, follower.y);
            beam.lineTo(endX, endY);
            beam.strokePath();
            
            // Add glow effect
            const glowBeam = scene.add.graphics();
            glowBeam.lineStyle(12, 0x800080, 0.3);
            glowBeam.beginPath();
            glowBeam.moveTo(follower.x, follower.y);
            glowBeam.lineTo(endX, endY);
            glowBeam.strokePath();
            
            // Animate beam
            scene.tweens.add({
                targets: [beam, glowBeam],
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    beam.destroy();
                    glowBeam.destroy();
                }
            });
            
            // Add particle effect along beam
            const beamParticles = scene.add.particles('particle');
            const emitter = beamParticles.createEmitter({
                speed: { min: 10, max: 50 },
                scale: { start: 0.4, end: 0 },
                blendMode: 'ADD',
                lifespan: 500,
                tint: 0x800080
            });
            
            // Emit particles along the beam
            const particleCount = 20;
            for (let i = 0; i < particleCount; i++) {
                const t = i / particleCount;
                const x = Phaser.Math.Linear(follower.x, endX, t);
                const y = Phaser.Math.Linear(follower.y, endY, t);
                emitter.setPosition(x, y);
                emitter.explode(3);
            }
            
            // Destroy particles after animation
            scene.time.delayedCall(500, () => {
                beamParticles.destroy();
            });
            
            // Hit all enemies in the beam path
            let hitCount = 0;
            enemies.forEach(enemy => {
                // Use line-circle intersection to detect hits
                const dist = Phaser.Math.Distance.PointToLine(
                    { x: enemy.x, y: enemy.y },
                    { x: follower.x, y: follower.y },
                    { x: endX, y: endY }
                );
                
                if (dist < TILE_SIZE / 2) {
                    // Damage enemy
                    damageEnemy(scene, enemy, 3);
                    hitCount++;
                    
                    // Visual impact effect
                    const impact = scene.add.sprite(enemy.x, enemy.y, 'particle')
                        .setTint(0x800080)
                        .setScale(2);
                        
                    scene.tweens.add({
                        targets: impact,
                        alpha: 0,
                        scale: 0.5,
                        duration: 300,
                        onComplete: () => impact.destroy()
                    });
                }
            });
            
            return hitCount > 0;
        }
    },
    shotgunner: {
        name: 'Shotgunner',
        color: 0xA52A2A, // Brown
        ability: 'Ember Spray',
        description: 'Fires a spray of deadly embers in a cone',
        specialAttack: function(scene, follower, enemies) {
            if (enemies.length === 0) return false;
            
            // Find target direction (towards closest enemy)
            let closestEnemy = null;
            let minDistance = Number.MAX_VALUE;
            
            enemies.forEach(enemy => {
                const distance = Phaser.Math.Distance.Between(
                    follower.x, follower.y, enemy.x, enemy.y
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = enemy;
                }
            });
            
            if (!closestEnemy) return false;
            
            // Calculate shot direction
            const angle = Phaser.Math.Angle.Between(
                follower.x, follower.y,
                closestEnemy.x, closestEnemy.y
            );
            
            // Visual cone effect
            const cone = scene.add.graphics();
            cone.fillStyle(0xA52A2A, 0.3);
            
            // Create a cone shape
            cone.beginPath();
            const spreadRadians = Math.PI / 4; // 45-degree spread
            const shotRange = TILE_SIZE * 5;
            
            cone.moveTo(follower.x, follower.y);
            cone.arc(
                follower.x, follower.y,
                shotRange,
                angle - spreadRadians / 2,
                angle + spreadRadians / 2,
                false
            );
            cone.closePath();
            cone.fill();
            
            // Fade out cone effect
            scene.tweens.add({
                targets: cone,
                alpha: 0,
                duration: 300,
                onComplete: () => cone.destroy()
            });
            
            // Create ember particles
            const particles = scene.add.particles('particle');
            const emitter = particles.createEmitter({
                speed: { min: 100, max: 200 },
                scale: { start: 0.4, end: 0 },
                lifespan: 500,
                tint: [0xFF4500, 0xFF8C00, 0xFFD700], // Fire colors
                emitZone: {
                    type: 'random',
                    source: new Phaser.Geom.Circle(0, 0, 10),
                    quantity: 15
                }
            });
            
            // Position emitter at follower
            emitter.setPosition(follower.x, follower.y);
            
            // Set direction
            emitter.setAngle(Phaser.Math.RadToDeg(angle) - 22.5, Phaser.Math.RadToDeg(angle) + 22.5);
            
            // Fire once
            emitter.explode(15);
            
            // Destroy particles after animation
            scene.time.delayedCall(600, () => {
                particles.destroy();
            });
            
            // Hit enemies in cone
            let hitCount = 0;
            enemies.forEach(enemy => {
                const distance = Phaser.Math.Distance.Between(
                    follower.x, follower.y, enemy.x, enemy.y
                );
                
                const enemyAngle = Phaser.Math.Angle.Between(
                    follower.x, follower.y, enemy.x, enemy.y
                );
                
                const angleDiff = Phaser.Math.Angle.Wrap(enemyAngle - angle);
                
                if (distance <= shotRange && Math.abs(angleDiff) <= spreadRadians / 2) {
                    // Damage falls off with distance
                    const damageMultiplier = 1 - (distance / shotRange) * 0.7;
                    const damage = Math.max(1, Math.round(3 * damageMultiplier));
                    
                    // Apply damage
                    damageEnemy(scene, enemy, damage);
                    hitCount++;
                }
            });
            
            return hitCount > 0;
        }
    },
    sniper: {
        name: 'Sniper',
        color: 0x708090, // Slate Gray
        ability: 'Piston Punch',
        description: 'Fires a high-powered shot that deals massive damage to a single target',
        specialAttack: function(scene, follower, enemies) {
            if (enemies.length === 0) return false;
            
            // Find the enemy with the most health
            let targetEnemy = null;
            let maxHealth = 0;
            
            enemies.forEach(enemy => {
                if (enemy.health > maxHealth) {
                    maxHealth = enemy.health;
                    targetEnemy = enemy;
                }
            });
            
            if (!targetEnemy) {
                // Fallback to closest enemy
                let minDistance = Number.MAX_VALUE;
                enemies.forEach(enemy => {
                    const distance = Phaser.Math.Distance.Between(
                        follower.x, follower.y, enemy.x, enemy.y
                    );
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        targetEnemy = enemy;
                    }
                });
            }
            
            if (!targetEnemy) return false;
            
            // Calculate shot direction
            const angle = Phaser.Math.Angle.Between(
                follower.x, follower.y,
                targetEnemy.x, targetEnemy.y
            );
            
            // Create laser sight effect
            const laserSight = scene.add.graphics();
            laserSight.lineStyle(1, 0xFF0000, 0.7);
            laserSight.lineBetween(
                follower.x, follower.y,
                targetEnemy.x, targetEnemy.y
            );
            
            // "Charging" animation
            scene.time.delayedCall(300, () => {
                // Remove laser sight
                laserSight.destroy();
                
                // Create bullet
                const bullet = scene.physics.add.sprite(follower.x, follower.y, 'bullet');
                bullet.setTint(0x708090);
                bullet.setScale(1.5);
                
                // Calculate velocity
                const speed = 500; // Very fast
                bullet.body.velocity.x = Math.cos(angle) * speed;
                bullet.body.velocity.y = Math.sin(angle) * speed;
                
                // Add to bullets array (but will handle impact manually)
                bullets.push(bullet);
                
                // Add trail effect
                const trail = scene.add.particles('particle');
                const emitter = trail.createEmitter({
                    speed: 10,
                    scale: { start: 0.2, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 200,
                    tint: 0x708090
                });
                
                // Follow the bullet
                let trailFollow = scene.time.addEvent({
                    delay: 10,
                    callback: function() {
                        if (bullet.active) {
                            emitter.setPosition(bullet.x, bullet.y);
                        }
                    },
                    repeat: 100
                });
                
                // Check for hit
                scene.time.addEvent({
                    delay: 30,
                    callback: function checkHit() {
                        if (!bullet.active) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            bullet.x, bullet.y, targetEnemy.x, targetEnemy.y
                        );
                        
                        if (distance < TILE_SIZE / 2 && targetEnemy.active) {
                            // Massive damage
                            damageEnemy(scene, targetEnemy, 6);
                            
                            // Big impact effect
                            const impact = scene.add.sprite(targetEnemy.x, targetEnemy.y, 'particle')
                                .setTint(0xFFFFFF)
                                .setScale(3);
                                
                            scene.tweens.add({
                                targets: impact,
                                alpha: 0,
                                scale: 0.5,
                                duration: 300,
                                onComplete: () => impact.destroy()
                            });
                            
                            // Knock target back
                            scene.tweens.add({
                                targets: targetEnemy,
                                x: targetEnemy.x + Math.cos(angle) * 30,
                                y: targetEnemy.y + Math.sin(angle) * 30,
                                duration: 100
                            });
                            
                            // Destroy bullet
                            bullet.destroy();
                            trailFollow.remove();
                            
                            // Clean up trail
                            emitter.stop();
                            scene.time.delayedCall(200, () => trail.destroy());
                            
                            // Remove from bullets array
                            const bulletIndex = bullets.indexOf(bullet);
                            if (bulletIndex !== -1) {
                                bullets.splice(bulletIndex, 1);
                            }
                        }
                    },
                    callbackScope: scene,
                    repeat: 20
                });
            });
            
            return true;
        }
    }
};

// Add final set of engineer classes
engineerClasses.shroomPixie = {
    name: 'Shroom Pixie',
    color: 0xFF69B4, // Hot Pink
    ability: 'Pressure Blast',
    description: 'Creates exploding mushrooms that release toxic spores',
    specialAttack: function(scene, follower, enemies) {
        if (enemies.length === 0) return false;
        
        // Number of mushrooms to spawn
        const mushroomCount = 3;
        let mushroomsPlaced = 0;
        
        // Try to place mushrooms near enemies
        const targetEnemies = enemies.slice(0, mushroomCount);
        
        targetEnemies.forEach(enemy => {
            // Place mushroom randomly near enemy
            const offsetX = Phaser.Math.Between(-TILE_SIZE, TILE_SIZE);
            const offsetY = Phaser.Math.Between(-TILE_SIZE, TILE_SIZE);
            
            const mushroomX = enemy.x + offsetX;
            const mushroomY = enemy.y + offsetY;
            
            // Ensure mushroom is within game bounds
            if (mushroomX < 0 || mushroomX > GAME_WIDTH || 
                mushroomY < 0 || mushroomY > GAME_HEIGHT) {
                return;
            }
            
            // Create mushroom sprite
            const mushroom = scene.physics.add.sprite(mushroomX, mushroomY, 'bullet');
            mushroom.setTint(0xFF69B4);
            mushroom.setScale(1.3);
            
            // Add pulsing animation
            scene.tweens.add({
                targets: mushroom,
                scale: 1.5,
                duration: 1500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    // Explode at end of animation
                    explodeMushroom(scene, mushroom.x, mushroom.y, TILE_SIZE * 2);
                    mushroom.destroy();
                }
            });
            
            mushroomsPlaced++;
        });
        
        // Place any remaining mushrooms randomly
        for (let i = mushroomsPlaced; i < mushroomCount; i++) {
            // Find a random position away from player
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(TILE_SIZE * 2, TILE_SIZE * 5);
            
            const mushroomX = follower.x + Math.cos(angle) * distance;
            const mushroomY = follower.y + Math.sin(angle) * distance;
            
            // Ensure mushroom is within game bounds
            if (mushroomX < 0 || mushroomX > GAME_WIDTH || 
                mushroomY < 0 || mushroomY > GAME_HEIGHT) {
                continue;
            }
            
            // Create mushroom sprite
            const mushroom = scene.physics.add.sprite(mushroomX, mushroomY, 'bullet');
            mushroom.setTint(0xFF69B4);
            mushroom.setScale(1.3);
            
            // Add pulsing animation
            scene.tweens.add({
                targets: mushroom,
                scale: 1.5,
                duration: 1500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    // Explode at end of animation
                    explodeMushroom(scene, mushroom.x, mushroom.y, TILE_SIZE * 2);
                    mushroom.destroy();
                }
            });
        }
        
        return mushroomsPlaced > 0;
    }
};

engineerClasses.thunderMage = {
    name: 'Thunder Mage',
    color: 0x7DF9FF, // Electric Blue
    ability: 'Thunder Strike',
    description: 'Calls down lightning bolts from above',
    specialAttack: function(scene, follower, enemies) {
        if (enemies.length === 0) return false;
        
        // Number of lightning strikes
        const strikeCount = 4;
        let strikesLanded = 0;
        
        // Choose random enemies to strike
        const targetEnemies = Phaser.Utils.Array.Shuffle(enemies.slice()).slice(0, strikeCount);
        
        targetEnemies.forEach(enemy => {
            // Warning effect (telegraph the strike)
            const warningCircle = scene.add.graphics();
            warningCircle.fillStyle(0x7DF9FF, 0.3);
            warningCircle.fillCircle(enemy.x, enemy.y, TILE_SIZE);
            
            // Pulsing warning animation
            scene.tweens.add({
                targets: warningCircle,
                alpha: 0.7,
                duration: 300,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    warningCircle.destroy();
                    
                    // Create lightning strike
                    const strikeHeight = 300; // How high above to start
                    
                    // Create lightning bolt graphic
                    const lightning = scene.add.graphics();
                    lightning.lineStyle(3, 0xFFFFFF, 1);
                    
                    // Create jagged lightning path
                    const segments = 6;
                    let prevX = enemy.x;
                    let prevY = enemy.y - strikeHeight;
                    
                    lightning.beginPath();
                    lightning.moveTo(prevX, prevY);
                    
                    for (let i = 1; i <= segments; i++) {
                        const progress = i / segments;
                        const jitter = 20 * (1 - progress); // Less jitter as we get closer to target
                        
                        const nextX = enemy.x + Phaser.Math.Between(-jitter, jitter);
                        const nextY = enemy.y - strikeHeight + (strikeHeight * progress);
                        
                        lightning.lineTo(nextX, nextY);
                        prevX = nextX;
                        prevY = nextY;
                    }
                    
                    // Ensure last segment hits the enemy
                    lightning.lineTo(enemy.x, enemy.y);
                    lightning.strokePath();
                    
                    // Glow effect
                    const glow = scene.add.graphics();
                    glow.lineStyle(9, 0x7DF9FF, 0.5);
                    glow.beginPath();
                    glow.moveTo(enemy.x, enemy.y - strikeHeight);
                    glow.lineTo(enemy.x, enemy.y);
                    glow.strokePath();
                    
                    // Flash the screen
                    const flash = scene.add.rectangle(
                        GAME_WIDTH / 2, GAME_HEIGHT / 2,
                        GAME_WIDTH, GAME_HEIGHT,
                        0xFFFFFF, 0.2
                    );
                    
                    scene.tweens.add({
                        targets: flash,
                        alpha: 0,
                        duration: 100,
                        onComplete: () => flash.destroy()
                    });
                    
                    // Impact effect
                    const impact = scene.add.graphics();
                    impact.fillStyle(0xFFFFFF, 0.8);
                    impact.fillCircle(enemy.x, enemy.y, TILE_SIZE);
                    
                    // Create particle explosion
                    const particles = scene.add.particles('particle');
                    const emitter = particles.createEmitter({
                        x: enemy.x,
                        y: enemy.y,
                        speed: { min: 50, max: 150 },
                        scale: { start: 0.5, end: 0 },
                        lifespan: 500,
                        quantity: 20,
                        tint: [0x7DF9FF, 0xFFFFFF]
                    });
                    
                    emitter.explode();
                    
                    // Damage enemy
                    damageEnemy(scene, enemy, 4);
                    strikesLanded++;
                    
                    // Chain damage to nearby enemies
                    enemies.forEach(nearbyEnemy => {
                        if (nearbyEnemy !== enemy) {
                            const distance = Phaser.Math.Distance.Between(
                                enemy.x, enemy.y, nearbyEnemy.x, nearbyEnemy.y
                            );
                            
                            if (distance < TILE_SIZE * 2) {
                                // Apply chain damage
                                damageEnemy(scene, nearbyEnemy, 2);
                                
                                // Create chain lightning effect
                                createLightningEffect(
                                    scene, 
                                    enemy.x, enemy.y, 
                                    nearbyEnemy.x, nearbyEnemy.y, 
                                    []
                                );
                            }
                        }
                    });
                    
                    // Cleanup effects
                    scene.time.delayedCall(200, () => {
                        lightning.destroy();
                        glow.destroy();
                        impact.destroy();
                    });
                    
                    scene.time.delayedCall(500, () => {
                        particles.destroy();
                    });
                }
            });
        });
        
        return true;
    }
};

engineerClasses.goblinTrapper = {
    name: 'Goblin Trapper',
    color: 0x32CD32, // Lime Green
    ability: 'Temporal Mine',
    description: 'Places explosive mines that damage enemies',
    specialAttack: function(scene, follower, enemies) {
        // Number of mines to place
        const mineCount = 3;
        let minesPlaced = 0;
        
        // Place mines in a triangle formation around the follower
        for (let i = 0; i < mineCount; i++) {
            const angle = (Math.PI * 2 / mineCount) * i;
            const distance = TILE_SIZE * 3;
            
            const mineX = follower.x + Math.cos(angle) * distance;
            const mineY = follower.y + Math.sin(angle) * distance;
            
            // Ensure mine is within game bounds
            if (mineX < 0 || mineX > GAME_WIDTH || 
                mineY < 0 || mineY > GAME_HEIGHT) {
                continue;
            }
            
            // Create mine sprite
            const mine = scene.physics.add.sprite(mineX, mineY, 'bullet');
            mine.setTint(0x32CD32);
            mine.setScale(0.8);
            
            // Add pulsing animation
            scene.tweens.add({
                targets: mine,
                scale: 1,
                duration: 1000,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
            
            // Set mine properties
            mine.damage = 3;
            mine.explosionRadius = TILE_SIZE * 2.5;
            mine.lifespan = 8000; // 8 seconds
            
            // Add to game objects
            scene.physics.add.existing(mine);
            bullets.push(mine);
            
            // Set up mine checks
            const mineCheck = scene.time.addEvent({
                delay: 200,
                callback: function() {
                    // Check for enemies in range
                    let triggered = false;
                    
                    enemies.forEach(enemy => {
                        if (!mine.active) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            mine.x, mine.y, enemy.x, enemy.y
                        );
                        
                        if (distance < TILE_SIZE) {
                            // Trigger mine
                            explodeMine(scene, mine, enemies);
                            mineCheck.remove();
                            triggered = true;
                        }
                    });
                    
                    // Auto-explode after lifespan
                    if (!triggered && mine.active) {
                        mine.lifespan -= 200;
                        
                        if (mine.lifespan <= 0) {
                            explodeMine(scene, mine, enemies);
                            mineCheck.remove();
                        } else if (mine.lifespan <= 1000) {
                            // Flash warning when about to explode
                            mine.setAlpha(mine.alpha === 1 ? 0.5 : 1);
                        }
                    }
                },
                callbackScope: scene,
                repeat: 40 // 8 seconds worth of checks
            });
            
            minesPlaced++;
        }
        
        return minesPlaced > 0;
    }
};

engineerClasses.shaman = {
    name: 'Shaman',
    color: 0x556B2F, // Dark Olive Green
    ability: 'Corrosion Cloud',
    description: 'Creates poisonous clouds that damage enemies over time',
    specialAttack: function(scene, follower, enemies) {
        if (enemies.length === 0) return false;
        
        // Find target location (near the most clustered enemies)
        let bestLocation = { x: follower.x, y: follower.y };
        let bestScore = 0;
        
        // Sample different locations
        for (let i = 0; i < 10; i++) {
            // Get a random enemy as center
            const centerEnemy = enemies[Phaser.Math.Between(0, enemies.length - 1)];
            
            // Count enemies in range
            let score = 0;
            const cloudRadius = TILE_SIZE * 3;
            
            enemies.forEach(enemy => {
                const distance = Phaser.Math.Distance.Between(
                    centerEnemy.x, centerEnemy.y, enemy.x, enemy.y
                );
                
                if (distance <= cloudRadius) {
                    score++;
                }
            });
            
            if (score > bestScore) {
                bestScore = score;
                bestLocation = { x: centerEnemy.x, y: centerEnemy.y };
            }
        }
        
        // If no good location found (unlikely), place at random enemy
        if (bestScore === 0 && enemies.length > 0) {
            const randomEnemy = enemies[Phaser.Math.Between(0, enemies.length - 1)];
            bestLocation = { x: randomEnemy.x, y: randomEnemy.y };
        }
        
        // Create poison cloud
        createPoisonCloud(scene, bestLocation.x, bestLocation.y, TILE_SIZE * 3);
        
        return true;
    }
};

// Helper functions for engineer abilities

function explodeMushroom(scene, x, y, radius) {
    // Visual explosion effect
    const explosion = scene.add.graphics();
    explosion.fillStyle(0xFF69B4, 0.5);
    explosion.fillCircle(x, y, radius);
    
    // Fade out explosion
    scene.tweens.add({
        targets: explosion,
        alpha: 0,
        duration: 500,
        onComplete: () => explosion.destroy()
    });
    
    // Create spore particles
    const particles = scene.add.particles('particle');
    const emitter = particles.createEmitter({
        x: x,
        y: y,
        speed: { min: 20, max: 70 },
        scale: { start: 0.5, end: 0 },
        lifespan: 1500,
        quantity: 30,
        tint: [0xFF69B4, 0xFF1493]
    });
    
    emitter.explode();
    
    // Damage enemies in radius
    enemies.forEach(enemy => {
        const distance = Phaser.Math.Distance.Between(
            x, y, enemy.x, enemy.y
        );
        
        if (distance <= radius) {
            // Apply damage (more damage closer to center)
            const damageMultiplier = 1 - (distance / radius) * 0.5;
            const damage = Math.max(1, Math.round(2 * damageMultiplier));
            
            damageEnemy(scene, enemy, damage);
            
            // Apply poison effect
            if (!enemy.isPoisoned) {
                enemy.isPoisoned = true;
                enemy.setTint(0xFF69B4);
                
                // Create poison timer
                let poisonTicks = 3;
                
                const poisonTimer = scene.time.addEvent({
                    delay: 1000,
                    callback: () => {
                        if (enemy.active) {
                            // Apply poison damage
                            damageEnemy(scene, enemy, 1);
                            
                            // Poison particles
                            const poisonEffect = scene.add.particles('particle');
                            const emitter = poisonEffect.createEmitter({
                                x: enemy.x,
                                y: enemy.y,
                                speed: { min: 10, max: 30 },
                                scale: { start: 0.3, end: 0 },
                                lifespan: 800,
                                quantity: 3,
                                tint: 0xFF69B4
                            });
                            
                            scene.time.delayedCall(800, () => {
                                poisonEffect.destroy();
                            });
                            
                            poisonTicks--;
                            
                            if (poisonTicks <= 0) {
                                // Remove poison
                                enemy.isPoisoned = false;
                                enemy.clearTint();
                                poisonTimer.remove();
                            }
                        } else {
                            // Enemy is dead, stop timer
                            poisonTimer.remove();
                        }
                    },
                    callbackScope: scene,
                    repeat: poisonTicks - 1
                });
            }
        }
    });
    
    // Clean up particles after effect
    scene.time.delayedCall(1500, () => {
        particles.destroy();
    });
}

function explodeMine(scene, mine, enemies) {
    if (!mine.active) return;
    
    // Visual explosion effect
    const explosion = scene.add.graphics();
    explosion.fillStyle(0xFFD700, 0.6);
    explosion.fillCircle(mine.x, mine.y, mine.explosionRadius);
    
    // Fade out explosion
    scene.tweens.add({
        targets: explosion,
        alpha: 0,
        duration: 500,
        onComplete: () => explosion.destroy()
    });
    
    // Create explosion particles
    const particles = scene.add.particles('particle');
    const emitter = particles.createEmitter({
        x: mine.x,
        y: mine.y,
        speed: { min: 50, max: 150 },
        scale: { start: 0.7, end: 0 },
        lifespan: 800,
        quantity: 30,
        tint: [0xFFD700, 0xFF8C00, 0xFF4500]
    });
    
    emitter.explode();
    
    // Damage enemies in radius
    enemies.forEach(enemy => {
        const distance = Phaser.Math.Distance.Between(
            mine.x, mine.y, enemy.x, enemy.y
        );
        
        if (distance <= mine.explosionRadius) {
            // Apply damage (more damage closer to center)
            const damageMultiplier = 1 - (distance / mine.explosionRadius) * 0.7;
            const damage = Math.max(1, Math.round(mine.damage * damageMultiplier));
            
            damageEnemy(scene, enemy, damage);
            
            // Knockback effect
            const angle = Phaser.Math.Angle.Between(mine.x, mine.y, enemy.x, enemy.y);
            const knockbackPower = 30 * damageMultiplier;
            
            scene.tweens.add({
                targets: enemy,
                x: enemy.x + Math.cos(angle) * knockbackPower,
                y: enemy.y + Math.sin(angle) * knockbackPower,
                duration: 200
            });
        }
    });
    
    // Remove the mine
    const mineIndex = bullets.indexOf(mine);
    if (mineIndex !== -1) {
        bullets.splice(mineIndex, 1);
    }
    
    mine.destroy();
    
    // Clean up particles after effect
    scene.time.delayedCall(800, () => {
        particles.destroy();
    });
}

function createPoisonCloud(scene, x, y, radius) {
    // Create cloud particles
    const particles = scene.add.particles('particle');
    const emitter = particles.createEmitter({
        x: x,
        y: y,
        speed: { min: 5, max: 20 },
        scale: { start: 0.5, end: 0.1 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 2000,
        quantity: 1,
        frequency: 50,
        tint: 0x556B2F,
        emitZone: {
            type: 'random',
            source: new Phaser.Geom.Circle(0, 0, radius),
            quantity: 12
        }
    });
    
    // Create cloud outline
    const cloudOutline = scene.add.graphics();
    cloudOutline.lineStyle(2, 0x556B2F, 0.5);
    cloudOutline.strokeCircle(x, y, radius);
    
    // Fade in/out animation
    cloudOutline.alpha = 0;
    scene.tweens.add({
        targets: cloudOutline,
        alpha: 0.5,
        duration: 500,
        yoyo: true,
        repeat: 5,
        onComplete: () => cloudOutline.destroy()
    });
    
    // Cloud duration
    const duration = 6000; // 6 seconds
    let elapsedTime = 0;
    const damageInterval = 1000; // Damage every second
    let lastDamageTime = 0;
    
    // Tick function for the cloud
    const cloudTick = scene.time.addEvent({
        delay: 100,
        callback: () => {
            elapsedTime += 100;
            
            // Apply damage at intervals
            if (elapsedTime - lastDamageTime >= damageInterval) {
                lastDamageTime = elapsedTime;
                
                // Damage enemies in cloud
                enemies.forEach(enemy => {
                    const distance = Phaser.Math.Distance.Between(
                        x, y, enemy.x, enemy.y
                    );
                    
                    if (distance <= radius) {
                        // Apply poison damage
                        damageEnemy(scene, enemy, 1);
                        
                        // Show poison effect
                        enemy.setTint(0x556B2F);
                        
                        // Clear tint after a moment
                        scene.time.delayedCall(500, () => {
                            if (enemy.active) {
                                enemy.clearTint();
                            }
                        });
                        
                        // Slow effect (stacking)
                        if (!enemy.poisonSlowFactor) {
                            enemy.poisonSlowFactor = 1;
                        }
                        
                        // Apply additional slow (max 50%)
                        if (enemy.poisonSlowFactor > 0.5) {
                            if (!enemy.originalSpeed) {
                                enemy.originalSpeed = enemy.speed;
                            }
                            
                            enemy.poisonSlowFactor *= 0.9;
                            enemy.speed = enemy.originalSpeed * enemy.poisonSlowFactor;
                        }
                    }
                });
            }
            
            // End cloud after duration
            if (elapsedTime >= duration) {
                emitter.stop();
                cloudTick.remove();
                
                // Clean up cloud after particles fade
                scene.time.delayedCall(2000, () => {
                    particles.destroy();
                });
                
                // Remove slow effects
                enemies.forEach(enemy => {
                    if (enemy.active && enemy.poisonSlowFactor) {
                        enemy.speed = enemy.originalSpeed;
                        enemy.poisonSlowFactor = 1;
                    }
                });
            }
        },
        callbackScope: scene,
        repeat: duration / 100
    });
}

// Function to damage an enemy
function damageEnemy(scene, enemy, amount) {
    // Initialize health if not already set
    if (enemy.health === undefined) {
        enemy.health = 3;
    }
    
    // Reduce health
    enemy.health -= amount;
    
    // Show damage text
    const damageText = scene.add.text(enemy.x, enemy.y - 20, amount.toString(), {
        fontSize: '16px',
        fontFamily: 'Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Fade out and destroy
    scene.tweens.add({
        targets: damageText,
        y: damageText.y - 30,
        alpha: 0,
        duration: 500,
        onComplete: () => damageText.destroy()
    });
    
    // Check if enemy is defeated
    if (enemy.health <= 0) {
        // Destroy enemy
        enemy.destroy();
        enemies = enemies.filter(e => e !== enemy);
        
        // Increase score
        score += enemy.scoreValue || 5;
        scoreText.setText('Score: ' + score);
        
        // Create explosion effect
        createExplosion(scene, enemy.x, enemy.y, enemy.tintTopLeft);
    } else {
        // Flash effect for damage
        scene.tweens.add({
            targets: enemy,
            alpha: 0.5,
            duration: 100,
            yoyo: true
        });
    }
}

// Create an explosion effect
function createExplosion(scene, x, y, color) {
    // Create particle effect
    const particles = scene.add.particles('particle');
    const emitter = particles.createEmitter({
        x: x,
        y: y,
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        lifespan: 500,
        quantity: 20,
        tint: color
    });
    
    // Explode once then destroy
    emitter.explode();
    
    scene.time.delayedCall(500, () => {
        particles.destroy();
    });
}

// Create a lightning effect between two points
function createLightningEffect(scene, x1, y1, x2, y2, lightningArray) {
    // Number of segments
    const segments = 8;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;
    
    // Create jagged line (lightning)
    let prevX = x1;
    let prevY = y1;
    
    for (let i = 1; i <= segments; i++) {
        const nextX = i === segments ? x2 : x1 + dx * i + (Math.random() * 15 - 7.5);
        const nextY = i === segments ? y2 : y1 + dy * i + (Math.random() * 15 - 7.5);
        
        const line = scene.add.line(0, 0, prevX, prevY, nextX, nextY, 0x00FFFF, 0.8);
        line.setLineWidth(2);
        prevX = nextX;
        prevY = nextY;
        
        // Add to lightning array for cleanup
        lightningArray.push(line);
    }
}

// Create a pickup for the snake to collect
function spawnPickup(scene) {
    // Find an open space
    let x, y;
    let validPosition = false;
    
    while (!validPosition) {
        x = Phaser.Math.Between(1, GAME_WIDTH / TILE_SIZE - 1) * TILE_SIZE;
        y = Phaser.Math.Between(1, GAME_HEIGHT / TILE_SIZE - 1) * TILE_SIZE;
        
        // Check if position is valid (not on snake)
        validPosition = true;
        
        if (x === player.x && y === player.y) {
            validPosition = false;
            continue;
        }
        
        for (let i = 0; i < followers.length; i++) {
            if (x === followers[i].x && y === followers[i].y) {
                validPosition = false;
                break;
            }
        }
    }
    
    // Create pickup sprite
    const pickup = scene.physics.add.sprite(x, y, 'pickup');
    pickups.push(pickup);
    
    // Animate pickup
    scene.tweens.add({
        targets: pickup,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
    
    return pickup;
}

// Collect a pickup
function collectPickup(scene, pickup) {
    // Remove from pickups array
    const index = pickups.indexOf(pickup);
    if (index !== -1) {
        pickups.splice(index, 1);
    }
    
    // Destroy pickup sprite
    pickup.destroy();
    
    // Create a follower
    createFollower(scene);
    
    // Spawn new pickup
    spawnPickup(scene);
    
    // Increase score
    score += 10;
    scoreText.setText('Score: ' + score);
    
    // Add experience
    addExperience(scene, 25);
}

// Create a follower (snake segment)
function createFollower(scene) {
    // Calculate position for new follower
    let x, y;
    
    // Position the new follower behind the last segment
    if (followers.length === 0) {
        // Position behind the head
        switch (direction) {
            case 'left':
                x = player.x + TILE_SIZE;
                y = player.y;
                break;
            case 'right':
                x = player.x - TILE_SIZE;
                y = player.y;
                break;
            case 'up':
                x = player.x;
                y = player.y + TILE_SIZE;
                break;
            case 'down':
                x = player.x;
                y = player.y - TILE_SIZE;
                break;
        }
    } else {
        // Position behind the last follower
        const lastFollower = followers[followers.length - 1];
        switch (lastFollower.direction) {
            case 'left':
                x = lastFollower.x + TILE_SIZE;
                y = lastFollower.y;
                break;
            case 'right':
                x = lastFollower.x - TILE_SIZE;
                y = lastFollower.y;
                break;
            case 'up':
                x = lastFollower.x;
                y = lastFollower.y + TILE_SIZE;
                break;
            case 'down':
                x = lastFollower.x;
                y = lastFollower.y - TILE_SIZE;
                break;
        }
    }
    
    // Create follower sprite
    const follower = scene.physics.add.sprite(x, y, 'follower');
    follower.direction = direction;
    follower.setTint(currentHeroClass.color);
    
    // Add health properties
    follower.health = 1; // Standard followers have 1 health
    follower.maxHealth = 1;
    
    // Create health bar
    follower.healthBar = scene.add.graphics();
    updateHealthBar(scene, follower);
    
    // Set rotation based on direction
    switch (direction) {
        case 'left':
            follower.angle = 180;
            break;
        case 'right':
            follower.angle = 0;
            break;
        case 'up':
            follower.angle = 270;
            break;
        case 'down':
            follower.angle = 90;
            break;
    }
    
    // Add to followers array
    followers.push(follower);
    
    return follower;
}

// Move the snake
function moveSnake(scene) {
    // First, store current position of each segment
    const positions = [];
    positions.push({ x: player.x, y: player.y, dir: direction });
    
    followers.forEach(follower => {
        positions.push({ x: follower.x, y: follower.y, dir: follower.direction });
    });
    
    // Update player position based on direction
    switch (direction) {
        case 'left':
            player.x -= TILE_SIZE;
            player.angle = 180;
            break;
        case 'right':
            player.x += TILE_SIZE;
            player.angle = 0;
            break;
        case 'up':
            player.y -= TILE_SIZE;
            player.angle = 270;
            break;
        case 'down':
            player.y += TILE_SIZE;
            player.angle = 90;
            break;
    }
    
    // Move each follower to the position of the segment in front of it
    for (let i = 0; i < followers.length; i++) {
        const follower = followers[i];
        const pos = positions[i];
        
        follower.x = pos.x;
        follower.y = pos.y;
        follower.direction = pos.dir;
        
        // Update rotation
        switch (follower.direction) {
            case 'left':
                follower.angle = 180;
                break;
            case 'right':
                follower.angle = 0;
                break;
            case 'up':
                follower.angle = 270;
                break;
            case 'down':
                follower.angle = 90;
                break;
        }
    }
    
    // Check if the snake's head collides with its body
    for (let i = 0; i < followers.length; i++) {
        if (player.x === followers[i].x && player.y === followers[i].y) {
            handleGameOver(scene);
            break;
        }
    }
    
    // Apply the queued direction change if one exists
    direction = nextDirection;
}

// Spawn an enemy
function spawnEnemy(scene) {
    if (gameOver) return;
    
    // Choose random spawn point on edge of screen
    let x, y;
    const side = Phaser.Math.Between(0, 3);
    
    switch (side) {
        case 0: // Top
            x = Phaser.Math.Between(0, GAME_WIDTH);
            y = -TILE_SIZE;
            break;
        case 1: // Right
            x = GAME_WIDTH + TILE_SIZE;
            y = Phaser.Math.Between(0, GAME_HEIGHT);
            break;
        case 2: // Bottom
            x = Phaser.Math.Between(0, GAME_WIDTH);
            y = GAME_HEIGHT + TILE_SIZE;
            break;
        case 3: // Left
            x = -TILE_SIZE;
            y = Phaser.Math.Between(0, GAME_HEIGHT);
            break;
    }
    
    // Create enemy sprite
    const enemy = scene.physics.add.sprite(x, y, 'enemy');
    
    // Random enemy color
    const colors = [0xFF0000, 0xFF6600, 0x0000FF, 0x9900FF];
    enemy.setTint(colors[Phaser.Math.Between(0, colors.length - 1)]);
    
    // Give enemy random speed based on current level
    const baseSpeed = 40 + (currentLevel * 3);
    enemy.speed = Phaser.Math.Between(baseSpeed - 10, baseSpeed + 10);
    
    // Set health based on current level
    enemy.health = Math.min(1 + Math.floor(currentLevel / 3), 5);
    enemy.scoreValue = enemy.health * 5;
    
    // Move toward player
    scene.physics.moveToObject(enemy, player, enemy.speed);
    
    // Add to enemies array
    enemies.push(enemy);
    
    return enemy;
}

// Handle game input
function handleInput(scene) {
    // Handle direction input
    if ((cursors.left.isDown || cursors.keyA.isDown) && direction !== 'right') {
        nextDirection = 'left';
    } else if ((cursors.right.isDown || cursors.keyD.isDown) && direction !== 'left') {
        nextDirection = 'right';
    } else if ((cursors.up.isDown || cursors.keyW.isDown) && direction !== 'down') {
        nextDirection = 'up';
    } else if ((cursors.down.isDown || cursors.keyS.isDown) && direction !== 'up') {
        nextDirection = 'down';
    }
    
    // Handle special attack input
    if (Phaser.Input.Keyboard.JustDown(specialAttackKey) && specialAttackCooldown <= 0) {
        useSpecialAttack(scene);
    }
}

// Use special attack
function useSpecialAttack(scene) {
    if (specialAttackCooldown > 0) return;
    
    // Use hero's special attack
    const success = currentHeroClass.specialAttack(scene);
    
    // Set cooldown
    if (success) {
        specialAttackCooldown = specialAttackCooldownMax;
        
        // Update cooldown display
        updateCooldownDisplay(scene);
    }
}

// Shoot a projectile
function shootProjectile(scene, x, y, dirX, dirY, type = 'bullet') {
    // Create bullet sprite
    const bullet = scene.physics.add.sprite(x, y, type);
    bullet.type = type;
    
    // Normalize direction
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    if (length > 0) {
        dirX /= length;
        dirY /= length;
    }
    
    // Set velocity
    const speed = 300;
    bullet.body.velocity.x = dirX * speed;
    bullet.body.velocity.y = dirY * speed;
    
    // Rotate to face direction
    bullet.rotation = Math.atan2(dirY, dirX);
    
    // Add to bullets array
    bullets.push(bullet);
    
    return bullet;
}

// Handle game over
function handleGameOver(scene) {
    if (gameOver) return;
    
    gameOver = true;
    
    // Stop movement
    scene.physics.pause();
    
    // Clean up health bars
    if (player.healthBar) {
        player.healthBar.destroy();
    }
    
    followers.forEach(follower => {
        if (follower.healthBar) {
            follower.healthBar.destroy();
        }
    });
    
    // Display game over text
    const gameOverText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER', {
        fontSize: '64px',
        fontFamily: 'Arial',
        color: '#FFFFFF',
        stroke: '#FF0000',
        strokeThickness: 6
    }).setOrigin(0.5);
    
    // Display final score
    scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, `Score: ${score}`, {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Display restart button
    const restartButton = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, 200, 50, 0x666666)
        .setInteractive({ useHandCursor: true });
    
    const restartText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, 'Restart', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Restart button interactivity
    restartButton
        .on('pointerover', () => restartButton.fillColor = 0x888888)
        .on('pointerout', () => restartButton.fillColor = 0x666666)
        .on('pointerdown', () => {
            scene.scene.start('TitleScene');
            gameOver = false;
        });
}

// Level up
function levelUp(scene) {
    // Increase level
    currentLevel++;
    levelText.setText('Level: ' + currentLevel);
    
    // Reset experience
    experience = 0;
    experienceToNextLevel = Math.floor(experienceToNextLevel * 1.2);
    
    // Decrease move delay (snake gets faster)
    moveDelay = Math.max(70, moveDelay - 5);
    
    // Decrease special cooldown
    specialAttackCooldownMax = Math.max(1000, specialAttackCooldownMax - 100);
    
    // Update exp bar
    experienceBar.width = 0;
    
    // Display level up text
    const levelUpText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LEVEL UP!', {
        fontSize: '48px',
        fontFamily: 'Arial',
        fill: '#FFFF00',
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5);
    
    // Fade out
    scene.tweens.add({
        targets: levelUpText,
        alpha: 0,
        y: levelUpText.y - 50,
        duration: 1500,
        onComplete: () => levelUpText.destroy()
    });
}

// Check for level up
function checkLevelUp(scene) {
    if (experience >= experienceToNextLevel) {
        levelUp(scene);
    }
}

// Add experience and check for level up
function addExperience(scene, amount) {
    experience += amount;
    
    // Update experience bar
    const expRatio = experience / experienceToNextLevel;
    experienceBar.width = (GAME_WIDTH - 40) * expRatio;
    
    // Check for level up
    if (experience >= experienceToNextLevel) {
        levelUp(scene);
    }
}

// Update enemies
function updateEnemies(scene, delta) {
    // Update each enemy
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // Skip if frozen
        if (enemy.isFrozen) continue;
        
        // Move toward player
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
        const speed = enemy.speed || 50; // Default speed if not set
        
        enemy.body.velocity.x = Math.cos(angle) * speed;
        enemy.body.velocity.y = Math.sin(angle) * speed;
        
        // Rotate toward movement direction
        enemy.rotation = angle;
        
        // Check collisions with player
        const distanceToPlayer = Phaser.Math.Distance.Between(
            enemy.x, enemy.y, player.x, player.y
        );
        
        if (distanceToPlayer < TILE_SIZE/2 && !enemy.hasDealtDamage) {
            // Damage player
            damageCharacter(scene, player, 1);
            
            // Mark this enemy as having dealt damage (to prevent multiple hits)
            enemy.hasDealtDamage = true;
            
            // Clear the flag after a delay
            scene.time.delayedCall(500, () => {
                if (enemy.active) {
                    enemy.hasDealtDamage = false;
                }
            });
        }
        
        // Check collisions with followers
        for (let j = 0; j < followers.length; j++) {
            const follower = followers[j];
            const distanceToFollower = Phaser.Math.Distance.Between(
                enemy.x, enemy.y, follower.x, follower.y
            );
            
            if (distanceToFollower < TILE_SIZE/2 && !enemy.hasDealtDamageToFollower) {
                // Damage follower
                damageCharacter(scene, follower, 1);
                
                // Mark this enemy as having dealt damage to a follower
                enemy.hasDealtDamageToFollower = true;
                
                // Clear the flag after a delay
                scene.time.delayedCall(500, () => {
                    if (enemy.active) {
                        enemy.hasDealtDamageToFollower = false;
                    }
                });
            }
        }
    }
}

// Update bullets
function updateBullets(scene, delta) {
    // Update each bullet
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        
        // Check if bullet is out of bounds
        if (bullet.x < 0 || bullet.x > GAME_WIDTH || bullet.y < 0 || bullet.y >= GAME_HEIGHT) {
            bullet.destroy();
            bullets.splice(i, 1);
            i--;
            continue;
        }
        
        // Check for collision with enemies
        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            const distance = Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.x, enemy.y);
            
            if (distance < TILE_SIZE) {
                // Damage enemy
                damageEnemy(scene, enemy, bullet.damage || 1);
                
                // Apply frost effect if it's a frost bolt
                if (bullet.freezeEffect && !enemy.isFrozen) {
                    enemy.setTint(0x00FFFF);
                    enemy.isFrozen = true;
                    
                    // Store original speed
                    if (!enemy.originalSpeed) {
                        enemy.originalSpeed = enemy.speed;
                    }
                    
                    // Slow by 50%
                    enemy.speed = enemy.originalSpeed * 0.5;
                    
                    // Restore after delay
                    scene.time.delayedCall(1500, () => {
                        if (enemy.active) {
                            enemy.clearTint();
                            enemy.isFrozen = false;
                            enemy.speed = enemy.originalSpeed;
                        }
                    });
                }
                
                // Destroy bullet
                bullet.destroy();
                bullets.splice(i, 1);
                i--;
                break;
            }
        }
    }
}

// Update cooldown display
function updateCooldownDisplay(scene) {
    // Update cooldown bar width
    const cooldownRatio = specialAttackCooldown / specialAttackCooldownMax;
    specialCooldownBar.width = 100 * (1 - cooldownRatio);
    
    // Update cooldown text
    if (specialAttackCooldown <= 0) {
        cooldownText.setText('READY');
        cooldownText.setFill('#FFFFFF');
    } else {
        const seconds = Math.ceil(specialAttackCooldown / 1000);
        cooldownText.setText(seconds + 's');
        cooldownText.setFill('#AAAAAA');
    }
}

// Create a follower with an engineer class
function createClassFollower(scene, engineerClass) {
    let x, y;
    
    // Position the new follower behind the last segment
    if (followers.length === 0) {
        // Position behind the head
        switch (direction) {
            case 'left':
                x = player.x + TILE_SIZE;
                y = player.y;
                break;
            case 'right':
                x = player.x - TILE_SIZE;
                y = player.y;
                break;
            case 'up':
                x = player.x;
                y = player.y + TILE_SIZE;
                break;
            case 'down':
                x = player.x;
                y = player.y - TILE_SIZE;
                break;
        }
    } else {
        // Position behind the last follower
        const lastFollower = followers[followers.length - 1];
        switch (lastFollower.direction) {
            case 'left':
                x = lastFollower.x + TILE_SIZE;
                y = lastFollower.y;
                break;
            case 'right':
                x = lastFollower.x - TILE_SIZE;
                y = lastFollower.y;
                break;
            case 'up':
                x = lastFollower.x;
                y = lastFollower.y + TILE_SIZE;
                break;
            case 'down':
                x = lastFollower.x;
                y = lastFollower.y - TILE_SIZE;
                break;
        }
    }
    
    // Create the follower sprite
    const follower = scene.physics.add.sprite(x, y, 'follower');
    follower.direction = direction;
    follower.setTint(engineerClass.color);
    
    // Add health properties
    follower.health = 2; // Engineers have 2 health
    follower.maxHealth = 2;
    
    // Create health bar
    follower.healthBar = scene.add.graphics();
    updateHealthBar(scene, follower);
    
    // Add class properties
    follower.engineerClass = engineerClass;
    follower.specialAttackCooldown = 0;
    
    // Calculate attack cooldown based on engineer class
    // Default is 5 seconds, but we can vary this by class
    let baseAttackCooldown = 3000; // 3 seconds base cooldown
    let attackCooldownVariance = 1000; // ±1 second variance
    
    // Adjust cooldown based on engineer type
    switch (engineerClass.name) {
        case 'Shotgunner':
        case 'Holy Bard':
        case 'Shaman':
            // Shorter cooldown for area damage classes
            baseAttackCooldown = 4000;
            break;
        case 'Sniper':
        case 'Dark Mage':
        case 'Thunder Mage':
            // Longer cooldown for high damage classes
            baseAttackCooldown = 5000;
            break;
        case 'Ninja':
        case 'Voltaic':
            // Medium cooldown for mid-tier attackers
            baseAttackCooldown = 3500;
            break;
        case 'Chronotemporal':
        case 'Ice Mage':
            // Shorter cooldown for crowd control
            baseAttackCooldown = 4500;
            break;
        case 'Shroom Pixie':
        case 'Goblin Trapper':
            // Mid cooldown for trap classes
            baseAttackCooldown = 4000;
            break;
    }
    
    // Apply level scaling to cooldown (higher levels = faster attacks)
    const cooldownReduction = Math.min(0.4, currentLevel * 0.03); // 3% per level, max 40%
    baseAttackCooldown = Math.max(1500, baseAttackCooldown * (1 - cooldownReduction));
    
    follower.specialAttackCooldownMax = baseAttackCooldown;
    
    // Set rotation based on direction
    switch (direction) {
        case 'left':
            follower.angle = 180;
            break;
        case 'right':
            follower.angle = 0;
            break;
        case 'up':
            follower.angle = 270;
            break;
        case 'down':
            follower.angle = 90;
            break;
    }
    
    // Add to followers array
    followers.push(follower);
    
    // Show class joining message
    const notificationText = scene.add.text(
        follower.x, 
        follower.y - 30, 
        engineerClass.name + ' joined!', 
        {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        }
    ).setOrigin(0.5);
    
    // Fade out notification
    scene.tweens.add({
        targets: notificationText,
        y: notificationText.y - 50,
        alpha: 0,
        duration: 1500,
        onComplete: () => notificationText.destroy()
    });
    
    // Increase score
    score += 15;
    scoreText.setText('Score: ' + score);
    
    // Create collection effect
    createExplosion(scene, x, y, engineerClass.color);
    
    // Check for level up
    checkLevelUp(scene);
    
    return follower;
}

// Spawn an engineer to collect
function spawnEngineer(scene) {
    // Find an open space
    let x, y;
    let validPosition = false;
    
    while (!validPosition) {
        x = Phaser.Math.Between(2, GAME_WIDTH / TILE_SIZE - 2) * TILE_SIZE;
        y = Phaser.Math.Between(2, GAME_HEIGHT / TILE_SIZE - 2) * TILE_SIZE;
        
        // Check if position is valid (not on snake, enemies, or other engineers)
        validPosition = true;
        
        if (x === player.x && y === player.y) {
            validPosition = false;
            continue;
        }
        
        for (let i = 0; i < followers.length; i++) {
            if (x === followers[i].x && y === followers[i].y) {
                validPosition = false;
                break;
            }
        }
        
        if (!validPosition) continue;
        
        for (let i = 0; i < enemies.length; i++) {
            if (Phaser.Math.Distance.Between(x, y, enemies[i].x, enemies[i].y) < TILE_SIZE * 2) {
                validPosition = false;
                break;
            }
        }
        
        if (!validPosition) continue;
        
        for (let i = 0; i < engineers.length; i++) {
            if (x === engineers[i].x && y === engineers[i].y) {
                validPosition = false;
                break;
            }
        }
    }
    
    // Choose a random engineer class
    const classKeys = Object.keys(engineerClasses);
    const randomClass = engineerClasses[classKeys[Phaser.Math.Between(0, classKeys.length - 1)]];
    
    // Create engineer sprite
    const engineer = scene.physics.add.sprite(x, y, 'follower');
    engineer.setTint(randomClass.color);
    engineer.engineerClass = randomClass;
    
    // Add pulsing animation
    scene.tweens.add({
        targets: engineer,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
    
    // Add to engineers array
    engineers.push(engineer);
    
    // Destroy after 20 seconds if not collected
    scene.time.delayedCall(20000, () => {
        if (engineer.active) {
            const index = engineers.indexOf(engineer);
            if (index !== -1) {
                engineers.splice(index, 1);
            }
            engineer.destroy();
        }
    });
    
    return engineer;
}

// Collect an engineer
function collectEngineer(scene, engineer) {
    // Remove from engineers array
    const index = engineers.indexOf(engineer);
    if (index !== -1) {
        engineers.splice(index, 1);
    }
    
    // Destroy engineer sprite
    engineer.destroy();
    
    // Create special follower with this class
    createClassFollower(scene, engineer.engineerClass);
    
    // Create collection effect
    const collectionEffect = scene.add.particles('particle');
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
    
    // Destroy particles after they're done
    scene.time.delayedCall(800, () => {
        collectionEffect.destroy();
    });
    
    // Add notification
    const notification = scene.add.text(
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
    scene.tweens.add({
        targets: notification,
        y: notification.y - 50,
        alpha: 0,
        duration: 1500,
        onComplete: () => notification.destroy()
    });
}

// Add a function to update the health bar for a character
function updateHealthBar(scene, character) {
    if (!character.active) return;
    
    // Clear any existing health bar
    character.healthBar.clear();
    
    // Set the width of the health bar based on the tile size
    const barWidth = TILE_SIZE;
    const barHeight = 4;
    
    // Calculate the position of the health bar (above the character)
    const barX = character.x - barWidth / 2;
    const barY = character.y - TILE_SIZE / 2 - barHeight - 2;
    
    // Calculate the fill amount based on current health
    const healthRatio = character.health / character.maxHealth;
    
    // Draw the background (red)
    character.healthBar.fillStyle(0xFF0000);
    character.healthBar.fillRect(barX, barY, barWidth, barHeight);
    
    // Draw the foreground (green) based on current health
    character.healthBar.fillStyle(0x00FF00);
    character.healthBar.fillRect(barX, barY, barWidth * healthRatio, barHeight);
}

// Add a function to damage player and followers
function damageCharacter(scene, character, amount) {
    // Reduce health
    character.health -= amount;
    
    // Show damage text
    const damageText = scene.add.text(character.x, character.y - 20, amount.toString(), {
        fontSize: '16px',
        fontFamily: 'Arial',
        fill: '#FFFFFF'
    }).setOrigin(0.5);
    
    // Fade out and destroy
    scene.tweens.add({
        targets: damageText,
        y: damageText.y - 30,
        alpha: 0,
        duration: 500,
        onComplete: () => damageText.destroy()
    });
    
    // Update the health bar
    updateHealthBar(scene, character);
    
    // Check if character is defeated
    if (character.health <= 0) {
        if (character === player) {
            // Game over if player dies
            handleGameOver(scene);
        } else {
            // Remove follower if it dies
            const index = followers.indexOf(character);
            if (index !== -1) {
                followers.splice(index, 1);
            }
            
            // Create death effect
            createExplosion(scene, character.x, character.y, character.tintTopLeft);
            
            // Destroy the follower and its health bar
            character.healthBar.destroy();
            character.destroy();
        }
    } else {
        // Flash effect for damage
        scene.tweens.add({
            targets: character,
            alpha: 0.5,
            duration: 100,
            yoyo: true
        });
    }
}

// Perform basic attack based on hero class
function performBasicAttack(scene, pointer) {
    const attackCooldown = player.attackCooldown || 0;
    
    if (attackCooldown > 0) return;
    
    // Get direction from player to pointer
    const dx = pointer.worldX - player.x;
    const dy = pointer.worldY - player.y;
    
    switch (selectedHero) {
        case 'warrior':
            // Sword slash in direction of pointer
            performWarriorAttack(scene, dx, dy);
            break;
        case 'archer':
            // Fire arrow in direction of pointer
            performArcherAttack(scene, dx, dy);
            break;
        case 'mage':
            // Cast frost bolt in direction of pointer
            performMageAttack(scene, dx, dy);
            break;
    }
    
    // Set attack cooldown based on level (faster attacks at higher levels)
    const baseCooldown = 500; // 500ms base cooldown
    const cooldownReduction = Math.min(0.5, currentLevel * 0.03); // 3% reduction per level, max 50%
    player.attackCooldown = baseCooldown * (1 - cooldownReduction);
    
    // Reset cooldown after delay
    scene.time.delayedCall(player.attackCooldown, () => {
        player.attackCooldown = 0;
    });
}

// Warrior basic attack: short-range sweeping sword attack
function performWarriorAttack(scene, dx, dy) {
    // Normalize direction
    const angle = Math.atan2(dy, dx);
    const distance = 40; // Attack range
    
    // Visual effect
    const sword = scene.add.graphics();
    sword.fillStyle(0xFFFFFF, 0.7);
    
    // Create a cone/arc for the sword swing
    sword.beginPath();
    sword.arc(player.x, player.y, distance, angle - 0.5, angle + 0.5);
    sword.lineTo(player.x, player.y);
    sword.closePath();
    sword.fill();
    
    // Fade out effect
    scene.tweens.add({
        targets: sword,
        alpha: 0,
        duration: 200,
        onComplete: () => sword.destroy()
    });
    
    // Check for enemies in range
    enemies.forEach(enemy => {
        const enemyDx = enemy.x - player.x;
        const enemyDy = enemy.y - player.y;
        const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);
        const enemyAngle = Math.atan2(enemyDy, enemyDx);
        
        // If enemy is within range and the right angle of attack
        if (enemyDistance <= distance && 
            Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - angle)) <= 0.6) {
            // Damage enemy
            damageEnemy(scene, enemy, 2);
            
            // Knockback effect
            scene.tweens.add({
                targets: enemy,
                x: enemy.x + Math.cos(angle) * 15,
                y: enemy.y + Math.sin(angle) * 15,
                duration: 100
            });
        }
    });
}

// Archer basic attack: long-range arrow
function performArcherAttack(scene, dx, dy) {
    // Normalize direction
    const length = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = dx / length;
    const normalizedDy = dy / length;
    
    // Create and shoot arrow
    const arrow = shootProjectile(scene, player.x, player.y, normalizedDx, normalizedDy, 'arrow');
    arrow.damage = 3; // Arrows deal more damage than standard projectiles
    
    // Add some variance to arrow speed
    arrow.body.velocity.x *= (1 + Math.random() * 0.2);
    arrow.body.velocity.y *= (1 + Math.random() * 0.2);
    
    // Add trail effect
    const trail = scene.add.particles('particle');
    const emitter = trail.createEmitter({
        speed: 10,
        scale: { start: 0.2, end: 0 },
        blendMode: 'ADD',
        lifespan: 200,
        tint: 0x00FF00
    });
    
    // Follow the arrow
    scene.time.addEvent({
        delay: 30,
        callback: function() {
            if (arrow.active) {
                emitter.setPosition(arrow.x, arrow.y);
            } else {
                emitter.stop();
                scene.time.delayedCall(200, () => trail.destroy());
            }
        },
        repeat: 20
    });
}

// Mage basic attack: frost bolt that slows enemies
function performMageAttack(scene, dx, dy) {
    // Normalize direction
    const length = Math.sqrt(dx * dx + dy * dy);
    const normalizedDx = dx / length;
    const normalizedDy = dy / length;
    
    // Create frost bolt
    const bolt = scene.physics.add.sprite(player.x, player.y, 'bullet');
    bolt.setTint(0x00FFFF);
    bolt.damage = 1; // Lower damage but applies slow effect
    
    // Set velocity
    const speed = 350;
    bolt.body.velocity.x = normalizedDx * speed;
    bolt.body.velocity.y = normalizedDy * speed;
    bolt.rotation = Math.atan2(normalizedDy, normalizedDx);
    
    // Add to bullets array
    bullets.push(bolt);
    
    // Add frost effect
    const trail = scene.add.particles('particle');
    const emitter = trail.createEmitter({
        speed: 20,
        scale: { start: 0.3, end: 0 },
        blendMode: 'ADD',
        lifespan: 300,
        tint: 0x00FFFF
    });
    
    // Follow the bolt
    scene.time.addEvent({
        delay: 30,
        callback: function() {
            if (bolt.active) {
                emitter.setPosition(bolt.x, bolt.y);
            } else {
                emitter.stop();
                scene.time.delayedCall(300, () => trail.destroy());
            }
        },
        repeat: 30
    });
    
    // Add frost effect on hit
    bolt.freezeEffect = true;
}

// Configure the game
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#222222',
    parent: 'game-container',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [TitleScene, GameScene]
};

// Initialize the game when the window loads
window.onload = function() {
    // Create a new Phaser Game instance
    console.log('Creating Phaser game instance...');
    try {
        const game = new Phaser.Game(config);
        console.log('Phaser game instance created!');
        
        // Hide loading message after a delay
        setTimeout(() => {
            const loadingMsg = document.getElementById('loading-message');
            if (loadingMsg) loadingMsg.style.display = 'none';
        }, 1000);
    } catch (error) {
        console.error('Error creating game instance:', error);
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.innerHTML = `<strong>Error:</strong> ${error.message}<br>
                                  <small>${error.stack}</small><br><br>
                                  <button onclick="location.reload()">Reload Page</button>`;
            errorElement.style.display = 'block';
        }
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.style.display = 'none';
    }
}; 

// Handle special attack for engineer followers
function handleEngineerSpecialAttack(scene) {
    // This function is now deprecated as engineer followers attack automatically
    // Keep this as a legacy function in case we need to trigger manual attacks in the future
    followers.forEach(follower => {
        if (follower.engineerClass) {
            // Manual attack is no longer needed
            console.log("Engineers now attack automatically - manual attacks disabled");
        }
    });
}