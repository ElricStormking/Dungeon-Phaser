import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';
import { createGameTextures } from '../utils/textureGenerator.js';
import * as Helpers from '../utils/helpers.js'; // Import all helpers
import { heroClasses } from '../data/heroClasses.js';
import { engineerClasses } from '../data/engineerClasses.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // Game state properties (moved from global)
        this.player = null;
        this.followers = []; // Array to track order for movement
        this.followersGroup = null; // Physics group for followers
        this.enemies = null;
        this.pickups = null;
        this.bullets = null;
        this.engineers = null; // Collectible engineers group

        this.cursors = null;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.moveTimer = 0;
        this.moveDelay = 150;

        this.score = 0;
        this.scoreText = null;
        this.gameOver = false;
        this.gameActive = true; // Might not be needed if using gameOver

        this.specialAttackKey = null;
        this.specialAttackCooldown = 0;
        this.specialAttackCooldownMax = 3000;
        
        this.currentHeroClass = null;
        this.selectedHeroKey = 'warrior'; // Default

        this.currentLevel = 1;
        this.levelText = null;
        this.experienceToNextLevel = 100;
        this.experience = 0;

        // UI Elements
        this.experienceBar = null;
        this.specialCooldownBar = null;
        this.cooldownText = null;
        this.heroText = null;

        // Basic Attack
        this.basicAttackKey = null;
        this.playerAttackCooldownTimer = 0;
    }

    init(data) {
        console.log('GameScene init');
        // Get selected hero from TitleScene
        this.selectedHeroKey = data.selectedHeroKey || 'warrior'; 
        // Reset state variables that persist across scene restarts
        this.resetGameState();
    }

    resetGameState() {
        this.gameOver = false;
        this.gameActive = true;
        this.score = 0;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.moveTimer = 0;
        this.moveDelay = 150; // Reset difficulty/speed
        this.followers = []; // Clear the movement array
        this.currentLevel = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100;
        this.specialAttackCooldown = 0;
        this.specialAttackCooldownMax = 3000; // Reset cooldown max
        this.playerAttackCooldownTimer = 0;

        // Groups will be cleared/recreated in create()
        console.log('Game state reset for hero:', this.selectedHeroKey);
    }

    preload() {
        console.log('GameScene preload started');
        // Textures are already created in TitleScene preload
        // If running GameScene directly, uncomment the line below:
        // createGameTextures(this);
        console.log('GameScene assets available');
    }

    create() {
        console.log('GameScene create started');

        // --- Set World Bounds ---
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Set Hero Class
        this.currentHeroClass = heroClasses[this.selectedHeroKey];
        if (!this.currentHeroClass) {
            console.warn(`Hero key "${this.selectedHeroKey}" not found, defaulting to warrior.`);
            this.selectedHeroKey = 'warrior';
            this.currentHeroClass = heroClasses.warrior;
        }
        console.log('Selected hero:', this.selectedHeroKey, 'Hero class:', this.currentHeroClass.name);
        
        // --- Create Groups ---
        // Using Groups simplifies management and collision checks
        this.followersGroup = this.physics.add.group({
             // classType: Follower, // If you create a Follower class
             runChildUpdate: true // If followers have own update logic
         });
        this.enemies = this.physics.add.group({
            // classType: Enemy, 
            runChildUpdate: true, 
             createCallback: (enemy) => { // Initialize properties on creation/recycle
                 enemy.health = 1;
                 enemy.maxHealth = 1;
                 enemy.speed = 50;
                 enemy.scoreValue = 5;
                 enemy.experienceValue = 10;
                 enemy.isFrozen = false;
                 enemy.hasDealtDamage = false;
                 enemy.hasDealtDamageToFollower = false;
                 enemy.originalSpeed = 50;
                 Helpers.updateHealthBar(this, enemy);
             }
         });
         this.pickups = this.physics.add.group({ 
            // classType: Pickup, 
             maxSize: 10 // Limit number of pickups on screen
        }); 
         this.bullets = this.physics.add.group({ 
             // classType: Bullet,
              runChildUpdate: true, 
             maxSize: 50 // Pool bullets
         });
         this.engineers = this.physics.add.group({ maxSize: 5 }); // Collectible engineers

        // --- Create Player ---
        // Start player near the center of the larger world
        const startX = Math.floor(WORLD_WIDTH / 2 / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        const startY = Math.floor(WORLD_HEIGHT / 2 / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        this.player = this.physics.add.sprite(startX, startY, 'player');
        this.player.setTint(this.currentHeroClass.color);
        this.player.health = 50; 
        this.player.maxHealth = 50;
        this.player.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.8); 
        this.player.direction = this.direction; 
        Helpers.updateHealthBar(this, this.player);
        console.log('Player created at:', this.player.x, this.player.y);
        Helpers.setAngleFromDirection(this.player, this.direction);

        // --- Camera Setup ---
        const camera = this.cameras.main;
        camera.startFollow(this.player, true, 0.1, 0.1); 
        camera.setZoom(0.75); // Zoomed out further
        // *** Set camera bounds to the world bounds ***
        camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // --- Setup Input ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursors.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.cursors.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.cursors.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.cursors.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.specialAttackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.basicAttackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

        this.input.mouse.disableContextMenu();
        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.performBasicAttack(pointer); // Use scene method
            }
        });
        console.log('Input controls set up');

        // --- Setup UI ---
        this.setupUI();

        // --- Physics Overlaps ---
        this.setupCollisions();

        // --- Timed Events ---
        this.setupTimers();
        
        // --- Initial State ---
        this.spawnPickup(); // Create first pickup
        // Optionally add starting followers
        // this.createFollower(); 
        
        console.log('GameScene create completed');
    }

    setupUI() {
        const style = { fontSize: '18px', fontFamily: 'Arial', fill: '#fff' };
        const depth = 10;

        this.scoreText = this.add.text(16, 16, 'Score: 0', style).setDepth(depth);
        this.levelText = this.add.text(16, 40, 'Level: 1', style).setDepth(depth);
        this.heroText = this.add.text(16, 64, `Hero: ${this.currentHeroClass.name}`, style).setDepth(depth);

        // Experience Bar
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH - 40, 16, 0x333333).setDepth(depth);
        this.experienceBar = this.add.rectangle(20 + (GAME_WIDTH - 40)/2, GAME_HEIGHT - 20, 0, 12, 0x00ff00).setOrigin(0.5, 0.5).setDepth(depth + 1);
        this.experienceBar.geom.width=0; // Reset geom width

        // Special Cooldown Bar & Text
        const cdX = GAME_WIDTH - 110;
        const cdY = 20;
        this.add.rectangle(cdX + 50, cdY + 6, 100, 12, 0x550000).setDepth(depth); // Background
        this.specialCooldownBar = this.add.rectangle(cdX, cdY, 0, 12, 0xff0000).setOrigin(0, 0).setDepth(depth + 1);
        this.cooldownText = this.add.text(cdX + 50, cdY + 25, 'READY', { fontSize: '16px', fontFamily: 'Arial', fill: '#fff' }).setOrigin(0.5).setDepth(depth + 1);
        this.updateCooldownDisplay(); // Initialize display

        console.log('UI elements created');
    }

     setupCollisions() {
         // Player vs Pickups
         this.physics.add.overlap(this.player, this.pickups, this.collectPickup, null, this);

         // Player vs Engineers (Collectible)
         this.physics.add.overlap(this.player, this.engineers, this.collectEngineer, null, this);

         // Player vs Enemies
         this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);

         // Bullets vs Enemies
         this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemyCollision, null, this);

         // Followers vs Enemies
         this.physics.add.overlap(this.followersGroup, this.enemies, this.handleFollowerEnemyCollision, null, this);

         // Head vs Body (Still needs manual check in moveSnake or a dedicated overlap)
         // Option 1: Manual check in moveSnake (as before)
         // Option 2: Overlap check (more complex setup needed)
         // this.physics.add.overlap(this.player, this.followersGroup, this.handleGameOver, (player, follower) => follower !== this.followers[0], this); // Avoid collision with first follower
    }

    setupTimers() {
        // Enemy Spawning
        this.time.addEvent({
            delay: 2000, // Adjust based on level?
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // Engineer Spawning
        this.time.addEvent({
            delay: 15000, // Longer delay for engineers
            callback: this.spawnEngineer,
            callbackScope: this,
            loop: true
        });
    }

    update(time, delta) {
        if (this.gameOver) return;

        this.handleInput();

        // Move the snake periodically
        if (time > this.moveTimer) {
            this.moveSnake();
            this.moveTimer = time + this.moveDelay;
        }
        
        this.updateEnemies(delta);
        this.updateFollowerAttacks(delta);
        this.updateBullets(delta);

        // Update health bars (only if health changed? Optimization possible)
        Helpers.updateHealthBar(this, this.player);
        this.followersGroup.children.each(follower => Helpers.updateHealthBar(this, follower));
        this.enemies.children.each(enemy => Helpers.updateHealthBar(this, enemy));

        // Update Cooldown
        if (this.specialAttackCooldown > 0) {
            this.specialAttackCooldown = Math.max(0, this.specialAttackCooldown - delta);
            this.updateCooldownDisplay();
        }
        if (this.playerAttackCooldownTimer > 0) {
            this.playerAttackCooldownTimer -= delta;
        }
    }

    // --- Input Handling ---
    handleInput() {
        let dx = 0;
        let dy = 0;
        if (this.cursors.left.isDown || this.cursors.keyA.isDown) dx = -1;
        else if (this.cursors.right.isDown || this.cursors.keyD.isDown) dx = 1;
        if (this.cursors.up.isDown || this.cursors.keyW.isDown) dy = -1;
        else if (this.cursors.down.isDown || this.cursors.keyS.isDown) dy = 1;

        // Update nextDirection based on input, preventing reversal
        if (dx < 0 && this.direction !== 'right') this.nextDirection = 'left';
        else if (dx > 0 && this.direction !== 'left') this.nextDirection = 'right';
        else if (dy < 0 && this.direction !== 'down') this.nextDirection = 'up';
        else if (dy > 0 && this.direction !== 'up') this.nextDirection = 'down';

        // Special Attack
        if (Phaser.Input.Keyboard.JustDown(this.specialAttackKey)) {
             this.useSpecialAttack();
        }
        // Basic Attack (Keyboard)
        if (Phaser.Input.Keyboard.JustDown(this.basicAttackKey)) {
             this.performBasicAttack(null); // Pass null for pointer
        }
    }

    // --- Game Logic Methods ---

    moveSnake() {
        const positions = [];
        positions.push({ x: this.player.x, y: this.player.y, dir: this.direction });

        // Store positions of the *ordered* followers array
        this.followers.forEach(follower => {
            positions.push({ x: follower.x, y: follower.y, dir: follower.direction });
        });

        // Move player
        switch (this.direction) {
            case 'left': this.player.x -= TILE_SIZE; break;
            case 'right': this.player.x += TILE_SIZE; break;
            case 'up': this.player.y -= TILE_SIZE; break;
            case 'down': this.player.y += TILE_SIZE; break;
        }

        // --- Manual World Bounds Clamping --- 
        const halfTile = TILE_SIZE / 2;
        this.player.x = Phaser.Math.Clamp(this.player.x, halfTile, WORLD_WIDTH - halfTile);
        this.player.y = Phaser.Math.Clamp(this.player.y, halfTile, WORLD_HEIGHT - halfTile);
        // --- End Manual Clamping ---

         this.player.direction = this.direction; // Update player's direction property
         Helpers.setAngleFromDirection(this.player, this.direction);

        // Move followers (both sprite group and ordered array)
         for (let i = 0; i < this.followers.length; i++) {
             const followerSprite = this.followers[i]; // Get sprite from ordered array
             const pos = positions[i]; 
             if (followerSprite && followerSprite.active) { // Check if sprite exists and is active
                 followerSprite.x = pos.x;
                 followerSprite.y = pos.y;
                 followerSprite.direction = pos.dir;
                 Helpers.setAngleFromDirection(followerSprite, followerSprite.direction);
             } else {
                 // Discrepancy - follower might have been destroyed but not removed from array?
                 console.warn('Mismatch between followers array and active sprites during move.');
                  // Attempt to sync - remove invalid entry from array
                 this.followers.splice(i, 1);
                 i--; // Adjust loop index
             }
         }

        // Manual Head vs Body collision check (Overlap method is cleaner but more complex)
         for (let i = 0; i < this.followers.length; i++) { 
              if (this.player.x === this.followers[i].x && this.player.y === this.followers[i].y) {
                  this.handleGameOver();
                  return; 
              }
          }
        
        // Apply queued direction change
        this.direction = this.nextDirection;
    }

    updateEnemies(delta) {
        this.enemies.children.each(enemy => {
            if (!enemy.active || enemy.isFrozen) return;

            // Only move if reasonably close to player or camera view? (Optimization)
            // const cam = this.cameras.main;
            // if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) < cam.width * 1.5) {
                const speed = enemy.speed || 50; 
                this.physics.moveToObject(enemy, this.player, speed);
                enemy.rotation = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            // }
        });
    }

    updateFollowerAttacks(delta) {
         this.followersGroup.children.each(follower => {
            if (follower.active && follower.isEngineerFollower && this.enemies.countActive(true) > 0) {
                if (follower.specialAttackCooldown > 0) {
                    follower.specialAttackCooldown -= delta;
                }
                
                if (follower.specialAttackCooldown <= 0) {
                    // Pass necessary data to the attack function
                     const attackSuccess = follower.engineerClass.specialAttack(this, follower, this.enemies, Helpers);
                    
                    if (attackSuccess) {
                        const randomVariance = Phaser.Math.Between(-300, 300);
                        follower.specialAttackCooldown = follower.specialAttackCooldownMax + randomVariance;
                        
                        // Visual feedback
                        this.tweens.add({ targets: follower, scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true });
                    }
                }
            }
        });
    }

    updateBullets(delta) {
         this.bullets.children.each(bullet => {
             if (!bullet.active) return;

             // Remove if out of bounds
             if (bullet.x < -50 || bullet.x > WORLD_WIDTH + 50 || bullet.y < -50 || bullet.y > WORLD_HEIGHT + 50) {
                 this.bullets.remove(bullet, true, true);
                 return;
             }

             // Update lifespan for specific bullet types (e.g., sniper)
             if (bullet.lifespan !== undefined) {
                 bullet.lifespan -= delta;
                 if (bullet.lifespan <= 0) {
                     this.bullets.remove(bullet, true, true);
                 }
             }
         });
    }

    // --- Collision Handlers ---

    handlePlayerEnemyCollision(player, enemy) {
         // Implement damage cooldown on the enemy
         if (!enemy.hasDealtDamage) {
             Helpers.damageCharacter(this, player, 1);
             enemy.hasDealtDamage = true;
             this.time.delayedCall(500, () => { if(enemy.active) enemy.hasDealtDamage = false; });
         }
    }
    
    handleFollowerEnemyCollision(follower, enemy) {
         // Implement damage cooldown on the enemy for followers
         if (!enemy.hasDealtDamageToFollower) {
             Helpers.damageCharacter(this, follower, 1); 
             enemy.hasDealtDamageToFollower = true;
             this.time.delayedCall(500, () => { if(enemy.active) enemy.hasDealtDamageToFollower = false; });
         }
    }

     handleBulletEnemyCollision(bullet, enemy) {
         if (!bullet.active || !enemy.active) return; 

         const damage = bullet.damage || 1;
         let destroyBullet = true;

         // Handle piercing bullets (Ninja Gear)
         if (bullet.isPiercing) {
             if (!bullet.hitEnemies) bullet.hitEnemies = new Set(); // Initialize if needed

             if (!bullet.hitEnemies.has(enemy)) {
                 Helpers.damageEnemy(this, enemy, damage);
                 bullet.hitEnemies.add(enemy);
                 bullet.pierceCount = (bullet.pierceCount || 0) + 1;
                 if (bullet.pierceCount >= bullet.maxPierces) {
                     destroyBullet = true; 
                 } else {
                     destroyBullet = false; // Don't destroy yet
                 }
             } else {
                 // Already hit this enemy, don't interact further
                 return; 
             }
         } 
         // Handle Sniper shot (only hit intended target? or first target?)
         else if (bullet.isSniper) {
              if (enemy === bullet.target || bullet.target === undefined) { // Hit intended target or any if no target specified
                 Helpers.damageEnemy(this, enemy, damage);
                 // Knockback effect
                 const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, enemy.x, enemy.y);
                 if (enemy.body) {
                    enemy.body.velocity.x += Math.cos(angle) * 150; 
                    enemy.body.velocity.y += Math.sin(angle) * 150;
                    this.tweens.add({ targets: enemy.body.velocity, x: '*=0.5', y: '*=0.5', duration: 200});
                 }
                  destroyBullet = true; 
              } else {
                 destroyBullet = false; // Sniper shot missed intended target, let it pass through others
              }
         } 
         // Default bullet behavior
         else {
            Helpers.damageEnemy(this, enemy, damage);
         }

         // Apply frost effect (Mage basic attack)
         if (bullet.freezeEffect && !enemy.isFrozen) {
             enemy.setTint(0x00FFFF);
             enemy.isFrozen = true;
             if (!enemy.originalSpeed) enemy.originalSpeed = enemy.speed;
             enemy.speed = enemy.originalSpeed * 0.5;
             enemy.body.velocity.x *= 0.5;
             enemy.body.velocity.y *= 0.5;
             this.time.delayedCall(1500, () => {
                 if (enemy.active) {
                     enemy.clearTint();
                     enemy.isFrozen = false;
                     enemy.speed = enemy.originalSpeed;
                 }
             });
         }

         if (destroyBullet) {
             this.bullets.remove(bullet, true, true); 
         }
     }

    // --- Spawning Methods ---
    spawnPickup() {
         let x, y;
         let validPosition = false;
         let attempts = 0;
         const maxAttempts = 50;

         while (!validPosition && attempts < maxAttempts) {
             // Spawn within the larger world bounds
            x = Phaser.Math.Between(TILE_SIZE / 2, WORLD_WIDTH - TILE_SIZE / 2);
            y = Phaser.Math.Between(TILE_SIZE / 2, WORLD_HEIGHT - TILE_SIZE / 2);
            attempts++;
            
            // Check overlaps - consider only checking near the player/camera view?
            // For now, check against all existing objects in the world.
             if (x < TILE_SIZE/2 || x > WORLD_WIDTH - TILE_SIZE/2 || y < TILE_SIZE/2 || y > WORLD_HEIGHT - TILE_SIZE/2) {
                 validPosition = false; continue;
             }

             let overlapping = false;
             if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < TILE_SIZE * 1.5) overlapping = true;
             if (!overlapping) this.followersGroup.children.each(f => { if (Phaser.Math.Distance.Between(x, y, f.x, f.y) < TILE_SIZE * 1.5) overlapping = true; });
             if (!overlapping) this.pickups.children.each(p => { if (p.active && Phaser.Math.Distance.Between(x, y, p.x, p.y) < TILE_SIZE * 1.5) overlapping = true; });

             validPosition = !overlapping;
         }

         if (validPosition) {
            const pickup = this.pickups.get(x, y, 'pickup'); 
            if (pickup) {
                pickup.setActive(true).setVisible(true);
                pickup.body.setCircle(TILE_SIZE / 3); // Set physics body size
                 pickup.body.enable = true; // Ensure body is enabled on recycle
                this.tweens.add({ targets: pickup, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
                return pickup;
            }
         } else {
             console.warn('Could not find valid position for pickup after', maxAttempts, 'attempts.');
         }
         return null;
    }

    spawnEnemy() {
        if (this.gameOver) return;

         let x, y;
         const side = Phaser.Math.Between(0, 3);
         const buffer = TILE_SIZE * 2;
    
         // Spawn outside the new world bounds initially
         switch (side) {
             case 0: x = Phaser.Math.Between(0, WORLD_WIDTH); y = -buffer; break; // Top
             case 1: x = WORLD_WIDTH + buffer; y = Phaser.Math.Between(0, WORLD_HEIGHT); break; // Right
             case 2: x = Phaser.Math.Between(0, WORLD_WIDTH); y = WORLD_HEIGHT + buffer; break; // Bottom
             case 3: x = -buffer; y = Phaser.Math.Between(0, WORLD_HEIGHT); break; // Left
         }
    
         const enemy = this.enemies.get(x, y, 'enemy');
         if (!enemy) return; // Pool empty
    
         enemy.setActive(true).setVisible(true);
         enemy.body.enable = true; // Ensure body enabled
    
         const colors = [0xFF0000, 0xFF6600, 0x0000FF, 0x9900FF];
         enemy.setTint(colors[Phaser.Math.Between(0, colors.length - 1)]);
    
         const baseSpeed = 40 + (this.currentLevel * 3);
         enemy.speed = Phaser.Math.Between(baseSpeed - 10, baseSpeed + 10);
         enemy.health = Math.min(1 + Math.floor(this.currentLevel / 3), 5);
         enemy.maxHealth = enemy.health; 
         enemy.scoreValue = enemy.health * 5;
         enemy.experienceValue = enemy.health * 2; 
         enemy.isFrozen = false; 
         enemy.hasDealtDamage = false;
         enemy.hasDealtDamageToFollower = false;
         enemy.originalSpeed = enemy.speed;
    
         Helpers.updateHealthBar(this, enemy); 
          // Reset health bar position/visibility if recycled
         if(enemy.healthBar) enemy.healthBar.setVisible(true).setPosition(0,0); // Position updated in updateHealthBar
    
         this.physics.moveToObject(enemy, this.player, enemy.speed);
    }
    
    spawnEngineer() {
        if (this.gameOver) return;
         let x, y;
         let validPosition = false;
         let attempts = 0;
         const maxAttempts = 50;
    
         while (!validPosition && attempts < maxAttempts) {
             // Spawn within the larger world, but maybe not too close to edge?
             x = Phaser.Math.Between(TILE_SIZE * 2, WORLD_WIDTH - TILE_SIZE * 2);
             y = Phaser.Math.Between(TILE_SIZE * 2, WORLD_HEIGHT - TILE_SIZE * 2);
             attempts++;
            
             // Check overlaps - consider only checking near the player/camera view?
             // For now, check against all existing objects in the world.
             let overlapping = false;
             if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < TILE_SIZE * 2) overlapping = true;
             if (!overlapping) this.followersGroup.children.each(f => { if (Phaser.Math.Distance.Between(x, y, f.x, f.y) < TILE_SIZE * 2) overlapping = true; });
             if (!overlapping) this.enemies.children.each(e => { if (e.active && Phaser.Math.Distance.Between(x, y, e.x, e.y) < TILE_SIZE * 3) overlapping = true; });
             if (!overlapping) this.engineers.children.each(eng => { if (eng.active && Phaser.Math.Distance.Between(x, y, eng.x, eng.y) < TILE_SIZE * 2) overlapping = true; });
             
             validPosition = !overlapping;
         }
    
         if (validPosition) {
             const classKeys = Object.keys(engineerClasses);
             const randomClass = engineerClasses[classKeys[Phaser.Math.Between(0, classKeys.length - 1)]];
    
             const engineer = this.engineers.get(x, y, 'follower');
             if (!engineer) return; 
    
             engineer.setActive(true).setVisible(true);
             engineer.body.enable = true;
             engineer.setTint(randomClass.color);
             engineer.engineerClass = randomClass; 
             engineer.isEngineer = true; 
    
             this.tweens.add({ targets: engineer, scale: 1.2, duration: 500, yoyo: true, repeat: -1 });
    
             const lifespan = 20000;
             engineer.lifespanTimer = this.time.delayedCall(lifespan, () => {
                 if (engineer.active) {
                      Helpers.createExplosion(this, engineer.x, engineer.y, 0xAAAAAA); 
                      this.engineers.remove(engineer, true, true);
                 }
             });
              engineer.on('destroy', () => { if(engineer.lifespanTimer) engineer.lifespanTimer.remove(); });

         } else {
           console.warn('Could not find valid position for engineer after', maxAttempts, 'attempts.');
         }
    }

     // --- Collection Methods ---
    collectPickup(player, pickup) {
        this.pickups.remove(pickup, true, true);
        this.createFollower(); // Add a standard follower
        this.spawnPickup(); // Spawn a new pickup
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);
        this.addExperience(25);
        Helpers.createExplosion(this, pickup.x, pickup.y, 0xFFFF00); // Collection effect
    }

    collectEngineer(player, engineer) {
        const engineerClassData = engineer.engineerClass;
        this.engineers.remove(engineer, true, true);
        this.createClassFollower(engineerClassData); // Add engineer follower
        // Notification text
        const notificationText = this.add.text(engineer.x, engineer.y - 20, `${engineerClassData.name} joined!`, { fontSize: '16px', fontFamily: 'Arial', fill: '#FFFFFF', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
        this.tweens.add({ targets: notificationText, y: notificationText.y - 30, alpha: 0, duration: 1500, onComplete: () => notificationText.destroy() });
        Helpers.createExplosion(this, engineer.x, engineer.y, engineerClassData.color); 
    }

    // --- Follower Creation ---
    createFollower() {
        const lastSegment = this.followers.length > 0 ? this.followers[this.followers.length - 1] : this.player;
        const dir = lastSegment.direction || this.direction;
        let x, y;

        switch (dir) {
            case 'left': x = lastSegment.x + TILE_SIZE; y = lastSegment.y; break;
            case 'right': x = lastSegment.x - TILE_SIZE; y = lastSegment.y; break;
            case 'up': x = lastSegment.x; y = lastSegment.y + TILE_SIZE; break;
            case 'down': x = lastSegment.x; y = lastSegment.y - TILE_SIZE; break;
            default: x = lastSegment.x - TILE_SIZE; y = lastSegment.y;
        }

        const follower = this.followersGroup.create(x, y, 'follower');
        if (!follower) return null; // Group might be full

        follower.setActive(true).setVisible(true);
        follower.direction = dir;
        follower.setTint(this.player.tintTopLeft); 
        follower.health = 1; 
        follower.maxHealth = 1;
        follower.isEngineerFollower = false; 
        follower.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
        Helpers.updateHealthBar(this, follower);
        Helpers.setAngleFromDirection(follower, dir);
        
        this.followers.push(follower); // Add to ordered array for movement
        return follower;
    }

    createClassFollower(engineerClass) {
         const lastSegment = this.followers.length > 0 ? this.followers[this.followers.length - 1] : this.player;
         const dir = lastSegment.direction || this.direction;
         let x, y;
         switch (dir) {
            case 'left': x = lastSegment.x + TILE_SIZE; y = lastSegment.y; break;
            case 'right': x = lastSegment.x - TILE_SIZE; y = lastSegment.y; break;
            case 'up': x = lastSegment.x; y = lastSegment.y + TILE_SIZE; break;
            case 'down': x = lastSegment.x; y = lastSegment.y - TILE_SIZE; break;
            default: x = lastSegment.x - TILE_SIZE; y = lastSegment.y; 
        }

        const follower = this.followersGroup.create(x, y, 'follower');
        if (!follower) return null; 

        follower.setActive(true).setVisible(true);
        follower.direction = dir;
        follower.setTint(engineerClass.color);
        follower.health = 2;
        follower.maxHealth = 2;
        follower.isEngineerFollower = true;
        follower.engineerClass = engineerClass;
        follower.specialAttackCooldown = 0;
        follower.body.setSize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
        Helpers.updateHealthBar(this, follower);
        Helpers.setAngleFromDirection(follower, dir);

        // Calculate cooldown (copied from original helper)
         let baseAttackCooldown = 3000;
         switch (engineerClass.name) {
            case 'Shotgunner': case 'Holy Bard': case 'Shaman': baseAttackCooldown = 4000; break;
            case 'Sniper': case 'Dark Mage': case 'Thunder Mage': baseAttackCooldown = 5000; break;
            case 'Ninja': case 'Voltaic': baseAttackCooldown = 3500; break;
            case 'Chronotemporal': case 'Ice Mage': baseAttackCooldown = 4500; break;
            case 'Shroom Pixie': case 'Goblin Trapper': baseAttackCooldown = 4000; break;
         }
         const cooldownReduction = Math.min(0.4, this.currentLevel * 0.03);
         baseAttackCooldown = Math.max(1500, baseAttackCooldown * (1 - cooldownReduction));
         follower.specialAttackCooldownMax = baseAttackCooldown + Phaser.Math.Between(-300, 300);

         this.followers.push(follower); // Add to ordered array
         return follower;
    }

    // --- Attack Methods ---
    useSpecialAttack() {
        if (this.specialAttackCooldown > 0) return;
        
        const success = this.currentHeroClass.specialAttack(this, this.player, this.enemies, Helpers);
        
        if (success) {
            this.specialAttackCooldown = this.specialAttackCooldownMax;
            this.updateCooldownDisplay();
            // Add visual/sound feedback for player special?
        }
    }

    performBasicAttack(pointer) {
        if (this.playerAttackCooldownTimer > 0) return;

        let targetX, targetY;
        if (pointer) { // Mouse click
            targetX = pointer.worldX;
            targetY = pointer.worldY;
        } else { // Keyboard press (Q)
             switch(this.direction) {
                case 'right': targetX = this.player.x + 100; targetY = this.player.y; break;
                case 'left': targetX = this.player.x - 100; targetY = this.player.y; break;
                case 'up': targetX = this.player.x; targetY = this.player.y - 100; break;
                case 'down': targetX = this.player.x; targetY = this.player.y + 100; break;
                default: targetX = this.player.x + 100; targetY = this.player.y; 
            }
        }

        const dx = targetX - this.player.x;
        const dy = targetY - this.player.y;
        const angle = Math.atan2(dy, dx);
        const normalizedDx = Math.cos(angle);
        const normalizedDy = Math.sin(angle);

        switch (this.selectedHeroKey) {
            case 'warrior': this.performWarriorAttack(angle); break;
            case 'archer': this.performArcherAttack(normalizedDx, normalizedDy); break;
            case 'mage': this.performMageAttack(normalizedDx, normalizedDy); break;
        }

        // Set cooldown
        const baseCooldown = 500; 
        const cooldownReduction = Math.min(0.5, this.currentLevel * 0.03);
        this.playerAttackCooldownTimer = baseCooldown * (1 - cooldownReduction);
    }
    
    // Specific basic attack implementations
    performWarriorAttack(angle) {
         const distance = TILE_SIZE * 2.5; // Range
         const arc = 1.2; // Radians (about 70 degrees)

         // Visual effect
         const sword = this.add.graphics();
         sword.fillStyle(0xFFFFFF, 0.7);
         sword.slice(this.player.x, this.player.y, distance, angle - arc/2, angle + arc/2);
         sword.fillPath();
         this.tweens.add({ targets: sword, alpha: 0, duration: 150, onComplete: () => sword.destroy() });

         // Damage check
         const attackBounds = new Phaser.Geom.Polygon([
             this.player.x, this.player.y,
             this.player.x + Math.cos(angle - arc/2) * distance, this.player.y + Math.sin(angle - arc/2) * distance,
             this.player.x + Math.cos(angle + arc/2) * distance, this.player.y + Math.sin(angle + arc/2) * distance
         ]);

         this.enemies.children.each(enemy => {
             if (!enemy.active) return;
             if (Phaser.Geom.Intersects.RectangleToPolygon(enemy.getBounds(), attackBounds)) {
                 Helpers.damageEnemy(this, enemy, 2);
                 // Knockback
                 const knockbackAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                 if (enemy.body) {
                    enemy.body.velocity.x += Math.cos(knockbackAngle) * 100;
                    enemy.body.velocity.y += Math.sin(knockbackAngle) * 100;
                     this.tweens.add({ targets: enemy.body.velocity, x: '*=0.5', y: '*=0.5', duration: 200});
                 }
             }
         });
    }

    performArcherAttack(dx, dy) {
         const arrow = this.shootProjectile(this.player.x, this.player.y, dx, dy, 'arrow');
         if (!arrow) return;
         arrow.damage = 3;
         // Add trail
         const trail = this.add.particles('particle').createEmitter({ speed: 10, scale: { start: 0.2, end: 0 }, blendMode: 'ADD', lifespan: 200, tint: 0x00FF00, follow: arrow });
         arrow.on('destroy', () => { trail.stop(); this.time.delayedCall(200, () => trail.manager.destroy()); });
    }

    performMageAttack(dx, dy) {
        const bolt = this.shootProjectile(this.player.x, this.player.y, dx, dy, 'bullet');
         if (!bolt) return;
         bolt.setTint(0x00FFFF);
         bolt.damage = 1;
         bolt.freezeEffect = true; // Flag for collision handler
         // Add trail
         const trail = this.add.particles('particle').createEmitter({ speed: 20, scale: { start: 0.3, end: 0 }, blendMode: 'ADD', lifespan: 300, tint: 0x00FFFF, follow: bolt });
         bolt.on('destroy', () => { trail.stop(); this.time.delayedCall(300, () => trail.manager.destroy()); });
    }

    // Generic projectile function
    shootProjectile(x, y, dirX, dirY, texture = 'bullet') {
         const bullet = this.bullets.get(x, y, texture);
         if (!bullet) return null; // Pool empty

         bullet.setActive(true).setVisible(true);
         bullet.body.enable = true;
         bullet.type = texture;
         bullet.damage = 1; // Default damage
         bullet.isPiercing = false;
         bullet.isSniper = false;
         bullet.freezeEffect = false;
         bullet.hitEnemies = null; // Reset hit enemies for piercing

         const speed = 300;
         bullet.body.velocity.x = dirX * speed;
         bullet.body.velocity.y = dirY * speed;
         bullet.rotation = Math.atan2(dirY, dirX);
         
         return bullet;
    }

    // --- Leveling & Experience ---
    addExperience(amount) {
        if (this.gameOver) return;
        this.experience += amount;
        this.updateExperienceBar();
        if (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
    }

    updateExperienceBar() {
         const expRatio = Math.min(1, this.experience / this.experienceToNextLevel);
         // Animate bar fill
         this.tweens.add({ 
             targets: this.experienceBar.geom, // Target geom for direct width manipulation
             width: (GAME_WIDTH - 40) * expRatio,
             duration: 200,
             ease: 'Linear',
             onUpdate: () => { this.experienceBar.geom = this.experienceBar.geom; } // Force redraw
         });
    }

    levelUp() {
        this.currentLevel++;
        this.levelText.setText('Level: ' + this.currentLevel);
        this.experience = this.experience - this.experienceToNextLevel; // Carry over excess XP
        this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.2);
        this.updateExperienceBar(); // Update bar with new ratio

        this.moveDelay = Math.max(70, this.moveDelay - 5);
        this.specialAttackCooldownMax = Math.max(1000, this.specialAttackCooldownMax - 100);

        // Level Up text effect
        const levelUpText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'LEVEL UP!', { fontSize: '48px', fontFamily: 'Arial', fill: '#FFFF00', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5).setDepth(15);
        this.tweens.add({ targets: levelUpText, alpha: 0, y: levelUpText.y - 50, duration: 1500, onComplete: () => levelUpText.destroy() });
        
         // Heal player slightly on level up
         this.player.health = Math.min(this.player.maxHealth, this.player.health + Math.ceil(this.player.maxHealth * 0.1)); // Heal 10%
         Helpers.updateHealthBar(this, this.player);
    }

     // --- UI Updates ---
     updateCooldownDisplay() {
         if (!this.specialCooldownBar || !this.cooldownText) return; 
         const cooldownRatio = this.specialAttackCooldown / this.specialAttackCooldownMax;
         const barWidth = 100 * Math.max(0, 1 - cooldownRatio);
         this.specialCooldownBar.geom.width = barWidth; // Use geom for graphics update
         this.specialCooldownBar.geom = this.specialCooldownBar.geom; // Force redraw

         if (this.specialAttackCooldown <= 0) {
            this.cooldownText.setText('READY').setFill('#00FF00');
         } else {
            const seconds = Math.ceil(this.specialAttackCooldown / 1000);
            this.cooldownText.setText(seconds + 's').setFill('#AAAAAA');
         }
     }

     // --- Game Over ---
     handleGameOver() {
         if (this.gameOver) return;
         console.log("GAME OVER triggered");
         this.gameOver = true;
         this.physics.pause();
         // Stop timed events
         this.time.removeAllEvents(); 

         // Stop tweens on player/followers/enemies?

         // Dim background
         this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(19);

         // Show Game Over UI
         this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'GAME OVER', { fontSize: '64px', fontFamily: 'Arial', color: '#FF0000', stroke: '#FFFFFF', strokeThickness: 4 }).setOrigin(0.5).setDepth(20);
         this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, `Score: ${this.score}`, { fontSize: '32px', fontFamily: 'Arial', color: '#FFFFFF' }).setOrigin(0.5).setDepth(20);
         this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, `Level: ${this.currentLevel}`, { fontSize: '24px', fontFamily: 'Arial', color: '#FFFFFF' }).setOrigin(0.5).setDepth(20);

         const restartButton = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120, 200, 50, 0x666666).setInteractive({ useHandCursor: true }).setDepth(20);
         const restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120, 'Restart', { fontSize: '24px', fontFamily: 'Arial', color: '#FFFFFF' }).setOrigin(0.5).setDepth(20);

         restartButton.on('pointerover', () => restartButton.fillColor = 0x888888);
         restartButton.on('pointerout', () => restartButton.fillColor = 0x666666);
         restartButton.on('pointerdown', () => {
             this.scene.start('TitleScene'); // Go back to title
         });
     }

    // --- Complex Ability Implementations ---

    // Creates mushrooms or mines that explode after a delay or on contact
    createTimedExplosion(x, y, type, delay) {
        let tint, radius, damage, explosionFn;
        let texture = 'bullet'; // Default texture

        if (type === 'shroom') {
            tint = 0xFF69B4;
            radius = TILE_SIZE * 2.5;
            damage = 2; 
            explosionFn = this.explodeMushroom; 
            // texture = 'mushroom'; // Use a specific texture if available
        } else if (type === 'mine') {
            tint = 0x32CD32;
            radius = TILE_SIZE * 2.5;
            damage = 3;
            explosionFn = this.explodeMine;
            // texture = 'mine'; // Use a specific texture if available
        } else {
            console.warn('Unknown timed explosion type:', type);
            return; 
        }

        // Use a dedicated group for these temporary objects?
        const placeholder = this.physics.add.sprite(x, y, texture); 
        placeholder.setTint(tint).setScale(1.3);
        placeholder.body.setCircle(placeholder.width / 3);
        placeholder.body.allowGravity = false;
        // Store data directly on the sprite
        placeholder.setData({ damage, radius, explosionFn, type });
        placeholder.setDepth(1); // Ensure visible

        // Pulse tween
        this.tweens.add({
            targets: placeholder,
            scale: placeholder.scale * 1.2,
            duration: 500,
            yoyo: true,
            repeat: Math.floor(delay / 1000) -1
        });

        // Timer to trigger explosion
        const timer = this.time.delayedCall(delay, () => {
            if (placeholder.active) {
                const fn = placeholder.getData('explosionFn');
                if (fn) {
                    fn.call(this, placeholder.x, placeholder.y, placeholder.getData('radius'), placeholder.getData('damage'));
                }
                placeholder.destroy();
            }
        });
        placeholder.on('destroy', () => timer.remove());

        // Add overlap check for mines
        if (type === 'mine') {
            // Need a reference to the overlap handler to remove it on destroy
            placeholder.overlapHandler = this.physics.add.overlap(this.enemies, placeholder, (mineSprite, enemy) => {
                if (mineSprite.active && enemy.active) {
                    const fn = mineSprite.getData('explosionFn');
                    if (fn) {
                        fn.call(this, mineSprite.x, mineSprite.y, mineSprite.getData('radius'), mineSprite.getData('damage'));
                    }
                    mineSprite.destroy(); // Destroy on trigger
                }
            });
             placeholder.on('destroy', () => { if (placeholder.overlapHandler) placeholder.overlapHandler.destroy(); });
        }
    }

    // Specific explosion logic for Mushroom
    explodeMushroom(x, y, radius, damage) {
        Helpers.createExplosion(this, x, y, 0xFF69B4); // Visual
        // Damage & poison effect
        this.enemies.children.each(enemy => {
            if (!enemy.active) return;
            const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (distance <= radius) {
                const damageMultiplier = 1 - (distance / radius) * 0.5;
                const finalDamage = Math.max(1, Math.round(damage * damageMultiplier));
                Helpers.damageEnemy(this, enemy, finalDamage);
                this.applyPoison(enemy, 1, 3); // Apply poison effect
            }
        });
    }

    // Specific explosion logic for Mine
    explodeMine(x, y, radius, damage) {
        Helpers.createExplosion(this, x, y, 0xFFD700); // Visual
        // Damage & knockback
        this.enemies.children.each(enemy => {
            if (!enemy.active) return;
            const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (distance <= radius) {
                const damageMultiplier = 1 - (distance / radius) * 0.7;
                const finalDamage = Math.max(1, Math.round(damage * damageMultiplier));
                Helpers.damageEnemy(this, enemy, finalDamage);
                // Knockback
                const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
                const knockbackPower = 20 * damageMultiplier;
                if (enemy.body) { 
                    enemy.body.velocity.x += Math.cos(angle) * knockbackPower * 10; 
                    enemy.body.velocity.y += Math.sin(angle) * knockbackPower * 10;
                    this.tweens.add({ targets: enemy.body.velocity, x: '*=0.5', y: '*=0.5', duration: 300});
                }
            }
        });
    }

    // Apply poison effect to an enemy
    applyPoison(enemy, damagePerTick, ticks) {
        if (!enemy.active || enemy.isPoisoned) return;

        enemy.isPoisoned = true;
        enemy.setTint(0x90EE90); 
        let currentTicks = 0;

        const poisonTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!enemy.active) {
                    poisonTimer.remove();
                    return;
                }
                Helpers.damageEnemy(this, enemy, damagePerTick);
                currentTicks++;
                if (currentTicks >= ticks) {
                    enemy.isPoisoned = false;
                    enemy.clearTint();
                    poisonTimer.remove();
                }
            },
            loop: true
        });
        enemy.on('destroy', () => { if(poisonTimer) poisonTimer.remove(); }); 
    }

    // Create the Shaman's poison cloud
    createPoisonCloud(x, y, radius) {
        const duration = 6000; 
        const damageInterval = 1000;
        const damagePerTick = 1;
        const slowFactor = 0.9; 
        const maxSlow = 0.5; 

        const particles = this.add.particles(x, y, 'particle', {
            speed: { min: 5, max: 20 }, scale: { start: 0.5, end: 0.1 },
            alpha: { start: 0.6, end: 0 }, lifespan: 2000, quantity: 1, frequency: 50,
            tint: 0x556B2F, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, radius), quantity: 15 },
            blendMode: 'MULTIPLY'
        });
        if (!particles) return; 

        const cloudOutline = this.add.graphics();
        cloudOutline.lineStyle(2, 0x556B2F, 0.3);
        cloudOutline.strokeCircle(x, y, radius);
        this.tweens.add({ targets: cloudOutline, alpha: 0.1, duration: 750, yoyo: true, repeat: duration/1500 - 1, onComplete: () => cloudOutline.destroy() });

        const enemiesInCloud = new Map(); 

        const cloudTimer = this.time.addEvent({
            delay: damageInterval, 
            callback: () => {
                const currentEnemies = this.enemies.getChildren();
                const enemiesToRemove = new Set(enemiesInCloud.keys());

                currentEnemies.forEach(enemy => {
                    if (!enemy.active) {
                         enemiesToRemove.add(enemy); 
                         return;
                     }

                    const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                    if (distance <= radius) {
                        enemiesToRemove.delete(enemy); 

                        Helpers.damageEnemy(this, enemy, damagePerTick);
                        enemy.setTint(0x556B2F);
                        this.time.delayedCall(300, () => { if (enemy.active) enemy.clearTint(); });

                        if (!enemiesInCloud.has(enemy)) {
                             if (!enemy.originalSpeed) enemy.originalSpeed = enemy.speed;
                             enemiesInCloud.set(enemy, { slowFactor: 1 });
                         } 
                         let cloudData = enemiesInCloud.get(enemy);
                         if (cloudData.slowFactor > maxSlow) {
                             cloudData.slowFactor *= slowFactor;
                             enemy.speed = enemy.originalSpeed * cloudData.slowFactor;
                         }
                    } else {
                         enemiesToRemove.add(enemy);
                    }
                });

                 enemiesToRemove.forEach(enemy => {
                     if (enemiesInCloud.has(enemy)) {
                         if (enemy.active && enemy.originalSpeed) {
                             enemy.speed = enemy.originalSpeed;
                         }
                         enemiesInCloud.delete(enemy);
                     }
                 });
            },
            loop: true
        });

        this.time.delayedCall(duration, () => {
            if (cloudTimer) cloudTimer.remove();
            if (particles) particles.destroy(); // Destroy particle emitter
            if (cloudOutline) cloudOutline.destroy(); // Ensure outline is gone
            enemiesInCloud.forEach((data, enemy) => {
                if (enemy.active && enemy.originalSpeed) {
                    enemy.speed = enemy.originalSpeed;
                }
            });
        });
    }
} 