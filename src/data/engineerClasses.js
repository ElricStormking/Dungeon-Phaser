import { TILE_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
// TODO: Import or pass helper functions

// Engineer follower classes with unique abilities
export const engineerClasses = {
    chronotemporal: {
        name: 'Chronotemporal',
        color: 0xC78FFF, // Purple
        ability: 'Timeburst',
        description: 'Slows nearby enemies temporarily',
        specialAttack: function(scene, follower, enemies, helpers) {
            const range = TILE_SIZE * 4;
            let affected = 0;
            
            enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                const distance = Phaser.Math.Distance.Between(follower.x, follower.y, enemy.x, enemy.y);
                
                if (distance <= range && !enemy.isFrozen) {
                    enemy.setTint(0xAA88FF);
                    enemy.isFrozen = true;
                    
                    if (!enemy.originalSpeed) {
                        enemy.originalSpeed = enemy.speed;
                    }
                    enemy.speed = enemy.originalSpeed * 0.3;
                    enemy.body.velocity.x *= 0.3; // Also affect current velocity
                    enemy.body.velocity.y *= 0.3;
                    
                    const emitter = scene.add.particles(enemy.x, enemy.y, 'particle', {
                        speed: { min: 20, max: 40 },
                        scale: { start: 0.4, end: 0 },
                        lifespan: 1000,
                        quantity: 1,
                        frequency: 100,
                        tint: 0xAA88FF,
                        emitting: true // Keep emitting for follow effect
                    });
                    if (!emitter) return; 

                    let slowTimer = scene.time.addEvent({
                        delay: 100,
                        callback: () => {
                            if (enemy.active && enemy.isFrozen) {
                                emitter.setPosition(enemy.x, enemy.y); // Update position
                            } else {
                                emitter.stop(); // Stop emitting
                                // Destroy emitter after particles fade
                                scene.time.delayedCall(1000, () => { if (emitter) emitter.destroy(); }); 
                                if (slowTimer) slowTimer.remove();
                            }
                        },
                        loop: true 
                    });
                    
                    scene.time.delayedCall(2000, () => {
                        if (enemy.active) {
                            enemy.clearTint();
                            enemy.isFrozen = false;
                            if (enemy.originalSpeed) { 
                                enemy.speed = enemy.originalSpeed; 
                                // Re-apply velocity towards player if needed
                                // scene.physics.moveToObject(enemy, scene.player, enemy.speed); 
                            }
                        }
                         if (slowTimer) slowTimer.remove();
                         if (emitter && emitter.active) { 
                            emitter.stop();
                            scene.time.delayedCall(1000, () => { if (emitter) emitter.destroy(); });
                         }
                    });
                    
                    affected++;
                }
            });
            
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
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;
            
            let closestEnemy = scene.physics.closest(follower, enemies.getChildren());
            if (!closestEnemy || Phaser.Math.Distance.Between(follower.x, follower.y, closestEnemy.x, closestEnemy.y) > TILE_SIZE * 5) {
                 return false;
            }

            const maxChain = 3;
            const chainRange = TILE_SIZE * 4;
            const chainedEnemies = new Set();
            const lightningGraphics = [];
            let currentTarget = closestEnemy;
            let sourcePos = { x: follower.x, y: follower.y };

            for (let i = 0; i < maxChain; i++) {
                if (!currentTarget || !currentTarget.active || chainedEnemies.has(currentTarget)) {
                    break; // Stop chaining if target is invalid or already hit
                }

                helpers.createLightningEffect(scene, sourcePos.x, sourcePos.y, currentTarget.x, currentTarget.y, lightningGraphics);
                helpers.damageEnemy(scene, currentTarget, 1);
                chainedEnemies.add(currentTarget);
                
                sourcePos = { x: currentTarget.x, y: currentTarget.y };
                
                // Find next closest enemy not already chained
                let nextTarget = null;
                let minDistance = chainRange;
                enemies.getChildren().forEach(enemy => {
                    if (enemy.active && !chainedEnemies.has(enemy)) {
                        const distance = Phaser.Math.Distance.Between(sourcePos.x, sourcePos.y, enemy.x, enemy.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            nextTarget = enemy;
                        }
                    }
                });
                currentTarget = nextTarget; 
            }

            scene.time.delayedCall(200, () => { // Reduced delay for faster cleanup
                lightningGraphics.forEach(line => line.destroy());
            });
            
            return chainedEnemies.size > 0;
        }
    },
     iceMage: {
        name: 'Ice Mage',
        color: 0xB0E0E6, // Powder Blue
        ability: 'Frost Nova',
        description: 'Creates an expanding ring of ice that freezes enemies',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;
            
            const novaRadius = TILE_SIZE * 5;
            const hitEnemies = new Set(); // Track enemies hit in this nova

            const nova = scene.add.graphics();
            nova.fillStyle(0xB0E0E6, 0.3);
            nova.fillCircle(follower.x, follower.y, 10);
            
            scene.tweens.add({
                targets: nova,
                scale: novaRadius / 10,
                duration: 500,
                onUpdate: () => {
                    const currentRadius = 10 * nova.scale;
                    enemies.getChildren().forEach(enemy => {
                        if (!enemy.active || hitEnemies.has(enemy)) return;
                        
                        const distance = Phaser.Math.Distance.Between(follower.x, follower.y, enemy.x, enemy.y);
                        
                        // Freeze enemies within the expanding radius, not just the edge
                        if (distance <= currentRadius && !enemy.isFrozen) { 
                            hitEnemies.add(enemy);
                            enemy.frozenByNova = true; // Custom flag
                            enemy.setTint(0xB0E0E6);
                            
                            if (!enemy.originalSpeed) {
                                enemy.originalSpeed = enemy.speed;
                            }
                            enemy.body.velocity.x = 0;
                            enemy.body.velocity.y = 0;
                            enemy.speed = 0;
                            
                            const emitter = scene.add.particles(enemy.x, enemy.y, 'particle', {
                                speed: { min: 10, max: 20 },
                                scale: { start: 0.5, end: 0 },
                                lifespan: 1000,
                                quantity: 1,
                                frequency: 200, // Emits over time while frozen
                                tint: 0xB0E0E6
                            });
                            if (!emitter) return;
                            // Automatically destroy emitter after unfreeze delay + lifespan
                             scene.time.delayedCall(2500 + 1000, () => { if (emitter) emitter.destroy(); });

                            helpers.damageEnemy(scene, enemy, 1);
                            
                            scene.time.delayedCall(2500, () => {
                                if (enemy.active && enemy.frozenByNova) {
                                    enemy.clearTint();
                                    enemy.frozenByNova = false;
                                    enemy.isFrozen = false; // General frozen flag
                                    if (enemy.originalSpeed) {
                                         enemy.speed = enemy.originalSpeed; 
                                         // scene.physics.moveToObject(enemy, scene.player, enemy.speed);
                                     }
                                }
                                if (emitter) emitter.stop(); // Stop emitting when unfrozen
                            });
                        }
                    });
                },
                onComplete: () => {
                    scene.tweens.add({ targets: nova, alpha: 0, duration: 300, onComplete: () => nova.destroy() });
                }
            });
            
            return true; // Assume it always fires
        }
    },
    ninja: {
        name: 'Ninja',
        color: 0x696969, // Dark Gray
        ability: 'Gear Throw',
        description: 'Throws deadly spinning gears that pierce through enemies',
        specialAttack: function(scene, follower, enemies, helpers) { // Pass bullets group
             if (enemies.getLength() === 0) return false;
            
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
            ];
            
            directions.forEach(dir => {
                const gear = scene.bullets.create(follower.x, follower.y, 'bullet'); // Assuming scene.bullets is a Group
                if (!gear) return; // Pool might be empty

                gear.setActive(true).setVisible(true);
                gear.setTint(0x696969);
                // gear.setPipeline('Light2D'); // Requires WebGL and Light Pipeline
                gear.setScale(1.3);
                
                const speed = 250;
                gear.body.velocity.x = dir.x * speed;
                gear.body.velocity.y = dir.y * speed;
                
                // Custom properties for piercing logic (handle in bullet update/collision)
                gear.isPiercing = true;
                gear.pierceCount = 0;
                gear.maxPierces = 3;
                gear.damage = 2;
                gear.hitEnemies = new Set(); // Track enemies hit by this gear
                gear.type = 'gear'; // Identify type if needed

                scene.tweens.add({
                    targets: gear,
                    angle: 360,
                    duration: 1000,
                    repeat: -1,
                    ease: 'Linear'
                });

                 // Trail effect (consider pooling emitters)
                const trailEmitter = scene.add.particles(gear.x, gear.y, 'particle', {
                    speed: 10,
                    scale: { start: 0.2, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 200,
                    tint: 0x696969,
                    follow: gear // Use the built-in follow property
                });
                 if (!trailEmitter) return; 

                 // Destroy emitter when gear is destroyed
                 gear.on('destroy', () => {
                      if (trailEmitter) trailEmitter.destroy();
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
        specialAttack: function(scene, follower, enemies, helpers) {
            const fieldRadius = TILE_SIZE * 3;
            const fieldDuration = 3000; // 3 seconds
            const damageInterval = 500; // 0.5 seconds
            const ticks = fieldDuration / damageInterval;

            const field = scene.add.graphics();
            field.fillStyle(0xFFD700, 0.3);
            field.fillCircle(follower.x, follower.y, fieldRadius);
            scene.tweens.add({ targets: field, alpha: 0.1, duration: 500, yoyo: true, repeat: fieldDuration/1000 -1, onComplete: () => field.destroy() });

            const emitter = scene.add.particles(follower.x, follower.y, 'particle', {
                speed: { min: 30, max: 70 }, scale: { start: 0.4, end: 0 },
                lifespan: 1000, quantity: 2, frequency: 100, tint: 0xFFD700,
                emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, fieldRadius), quantity: 12 }
            });
             if (!emitter) return false;
             // Stop emitting and destroy after duration
             scene.time.delayedCall(fieldDuration, () => {
                 if (emitter) emitter.stop();
                 scene.time.delayedCall(1000, () => { if (emitter) emitter.destroy(); }); // Delay destroy for fade
             });

            let tickCount = 0;
            const damageTimer = scene.time.addEvent({
                delay: damageInterval,
                callback: () => {
                    enemies.getChildren().forEach(enemy => {
                        if (!enemy.active) return;
                        const distance = Phaser.Math.Distance.Between(follower.x, follower.y, enemy.x, enemy.y);
                        if (distance <= fieldRadius) {
                            helpers.damageEnemy(scene, enemy, 1);
                            // Add visual effect on enemy
                            const flash = scene.add.sprite(enemy.x, enemy.y, 'particle').setTint(0xFFD700).setScale(1.5);
                            scene.tweens.add({ targets: flash, alpha: 0, scale: 0.5, duration: 300, onComplete: () => flash.destroy() });
                        }
                    });
                    tickCount++;
                    if (tickCount >= ticks) {
                        damageTimer.remove();
                        emitter.stop();
                    }
                },
                loop: true
            });
            return true;
        }
    },
    darkMage: {
        name: 'Dark Mage',
        color: 0x800080, // Purple
        ability: 'Aether Beam',
        description: 'Channels dark energy beams that damage all enemies in a line',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;

            let closestEnemy = scene.physics.closest(follower, enemies.getChildren());
            if (!closestEnemy) return false;

            const angle = Phaser.Math.Angle.Between(follower.x, follower.y, closestEnemy.x, closestEnemy.y);
            const beamLength = GAME_WIDTH / 2; // Reduced to 50% of original range
            const beamWidth = TILE_SIZE; // For collision checking
            const endX = follower.x + Math.cos(angle) * beamLength;
            const endY = follower.y + Math.sin(angle) * beamLength;
            const beamLine = new Phaser.Geom.Line(follower.x, follower.y, endX, endY);

            // Visuals
            const beam = scene.add.graphics();
            beam.lineStyle(6, 0x800080, 0.8);
            beam.strokeLineShape(beamLine);
            const glowBeam = scene.add.graphics();
            glowBeam.lineStyle(12, 0x800080, 0.3);
            glowBeam.strokeLineShape(beamLine);
            scene.tweens.add({ targets: [beam, glowBeam], alpha: 0, duration: 500, onComplete: () => { beam.destroy(); glowBeam.destroy(); } });

            // Particles
            const beamParticles = scene.add.particles(0, 0, 'particle', { // Start at 0,0 - position set per point
                speed: { min: 10, max: 50 }, scale: { start: 0.4, end: 0 },
                blendMode: 'ADD', lifespan: 500, tint: 0x800080,
                emitting: false // Don't start emitting
            });
             if (!beamParticles) return false;

            const points = beamLine.getPoints(20); 
            points.forEach(p => beamParticles.emitParticleAt(p.x, p.y, 3)); // Emit at points

            // Destroy after short delay
            scene.time.delayedCall(500, () => { if (beamParticles) beamParticles.destroy(); });

            // Damage
            let hitCount = 0;
            enemies.getChildren().forEach(enemy => {
                 if (!enemy.active) return;
                 // More robust check: distance from enemy center to the line segment
                 const enemyPoint = new Phaser.Geom.Point(enemy.x, enemy.y);
                 if (Phaser.Geom.Intersects.LineToCircle(beamLine, new Phaser.Geom.Circle(enemy.x, enemy.y, TILE_SIZE / 2))) {
                     helpers.damageEnemy(scene, enemy, 3);
                     hitCount++;
                     // Visual impact
                     const impact = scene.add.sprite(enemy.x, enemy.y, 'particle').setTint(0x800080).setScale(2);
                     scene.tweens.add({ targets: impact, alpha: 0, scale: 0.5, duration: 300, onComplete: () => impact.destroy() });
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
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;

            let closestEnemy = scene.physics.closest(follower, enemies.getChildren());
            if (!closestEnemy) return false;

            const angle = Phaser.Math.Angle.Between(follower.x, follower.y, closestEnemy.x, closestEnemy.y);
            const spreadRadians = Math.PI / 4; // 45 degrees
            const shotRange = TILE_SIZE * 5;

            // Visual Cone
            const cone = scene.add.graphics();
            cone.fillStyle(0xA52A2A, 0.3);
            cone.beginPath();
            cone.moveTo(follower.x, follower.y);
            cone.arc(follower.x, follower.y, shotRange, angle - spreadRadians / 2, angle + spreadRadians / 2, false);
            cone.closePath();
            cone.fill();
            scene.tweens.add({ targets: cone, alpha: 0, duration: 300, onComplete: () => cone.destroy() });

            // Particles
            const emitter = scene.add.particles(follower.x, follower.y, 'particle', {
                speed: { min: 100, max: 200 }, scale: { start: 0.4, end: 0 }, lifespan: 500,
                tint: [0xFF4500, 0xFF8C00, 0xFFD700], 
                angle: { min: Phaser.Math.RadToDeg(angle - spreadRadians / 2), max: Phaser.Math.RadToDeg(angle + spreadRadians / 2) }, 
                emitting: false // Don't start emitting
            });
             if (!emitter) return false;

            emitter.explode(15); // Fire once
            // Destroy after lifespan
            scene.time.delayedCall(600, () => { if (emitter) emitter.destroy(); });

            // Damage
            let hitCount = 0;
            enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return;

                const distance = Phaser.Math.Distance.Between(follower.x, follower.y, enemy.x, enemy.y);
                const enemyAngle = Phaser.Math.Angle.Between(follower.x, follower.y, enemy.x, enemy.y);
                const angleDiff = Phaser.Math.Angle.Wrap(enemyAngle - angle); // Difference from center of cone

                // Check if within range and angle spread
                if (distance <= shotRange && Math.abs(angleDiff) <= spreadRadians / 2) {
                    // Damage falls off with distance
                    const damageMultiplier = Math.max(0, 1 - (distance / shotRange)); 
                    const damage = Math.max(1, Math.round(3 * damageMultiplier));
                    helpers.damageEnemy(scene, enemy, damage);
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
        specialAttack: function(scene, follower, enemies, helpers) { // Pass bullets group
             if (enemies.getLength() === 0) return false;

            // Target enemy with highest health, fallback to closest
            let targetEnemy = enemies.getChildren().reduce((target, enemy) => {
                 if (!enemy.active) return target;
                 return (!target || enemy.health > target.health) ? enemy : target;
             }, null);

            if (!targetEnemy) {
                 targetEnemy = scene.physics.closest(follower, enemies.getChildren());
            }
            if (!targetEnemy) return false;

            const angle = Phaser.Math.Angle.Between(follower.x, follower.y, targetEnemy.x, targetEnemy.y);

            // Laser Sight Visual
            const laserSight = scene.add.graphics();
            laserSight.lineStyle(1, 0xFF0000, 0.7);
            laserSight.lineBetween(follower.x, follower.y, targetEnemy.x, targetEnemy.y);
            
            scene.time.delayedCall(300, () => {
                laserSight.destroy();
                
                // Create Bullet (using bullet group)
                const bullet = scene.bullets.create(follower.x, follower.y, 'bullet');
                if (!bullet) return; // Pool empty

                bullet.setActive(true).setVisible(true);
                bullet.setTint(0x708090).setScale(1.5);
                
                const speed = 500;
                bullet.body.velocity.x = Math.cos(angle) * speed;
                bullet.body.velocity.y = Math.sin(angle) * speed;
                
                // Sniper bullet properties (handle in collision)
                bullet.isSniper = true;
                bullet.damage = 6;
                bullet.target = targetEnemy; // Mark the intended target
                bullet.type = 'sniper';

                // Trail effect
                 const trailEmitter = scene.add.particles(bullet.x, bullet.y, 'particle', {
                      speed: 10, scale: { start: 0.2, end: 0 }, blendMode: 'ADD', 
                      lifespan: 200, tint: 0x708090, 
                      follow: bullet // Use follow property
                  });
                  if (!trailEmitter) return;

                  bullet.on('destroy', () => { 
                      if (trailEmitter) trailEmitter.destroy(); 
                  });

                 // Set a lifespan or max distance for the bullet
                 bullet.lifespan = 2000; // Destroy after 2 seconds if it hits nothing
                 scene.time.delayedCall(bullet.lifespan, () => { if (bullet.active) bullet.destroy(); });
            });
            return true;
        }
    },
    shroomPixie: {
        name: 'Shroom Pixie',
        color: 0xFF69B4, // Hot Pink
        ability: 'Pressure Blast',
        description: 'Creates exploding mushrooms that release toxic spores',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;
            
            const mushroomCount = 3;
            let mushroomsPlaced = 0;
            const targetEnemies = Phaser.Utils.Array.Shuffle(enemies.getChildren().filter(e => e.active)).slice(0, mushroomCount);
            
            // Visual properties for mushroom bombs
            const mushroomRadius = TILE_SIZE * 2;
            const explosionDelay = 3000;
            const damage = 3;

            targetEnemies.forEach(enemy => {
                const offsetX = Phaser.Math.Between(-TILE_SIZE * 2, TILE_SIZE * 2);
                const offsetY = Phaser.Math.Between(-TILE_SIZE * 2, TILE_SIZE * 2);
                let mushroomX = Phaser.Math.Clamp(enemy.x + offsetX, TILE_SIZE, GAME_WIDTH - TILE_SIZE);
                let mushroomY = Phaser.Math.Clamp(enemy.y + offsetY, TILE_SIZE, GAME_HEIGHT - TILE_SIZE);
                
                // Create mushroom visual effect before explosion
                const mushroom = scene.add.graphics();
                mushroom.fillStyle(0xFF69B4, 0.5);
                mushroom.fillCircle(mushroomX, mushroomY, mushroomRadius * 0.5);
                
                scene.tweens.add({
                    targets: mushroom,
                    alpha: 0.8,
                    scale: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => mushroom.destroy()
                });
                
                // Create a custom timed explosion with mushroom-themed colors
                createCustomTimedExplosion(scene, mushroomX, mushroomY, mushroomRadius, explosionDelay, damage, 0xFF69B4);
                mushroomsPlaced++;
            });

            // Place remaining randomly near follower if needed
            for (let i = mushroomsPlaced; i < mushroomCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Phaser.Math.Between(TILE_SIZE * 2, TILE_SIZE * 5);
                let mushroomX = Phaser.Math.Clamp(follower.x + Math.cos(angle) * distance, TILE_SIZE, GAME_WIDTH - TILE_SIZE);
                let mushroomY = Phaser.Math.Clamp(follower.y + Math.sin(angle) * distance, TILE_SIZE, GAME_HEIGHT - TILE_SIZE);
                
                // Create mushroom visual effect before explosion
                const mushroom = scene.add.graphics();
                mushroom.fillStyle(0xFF69B4, 0.5);
                mushroom.fillCircle(mushroomX, mushroomY, mushroomRadius * 0.5);
                
                scene.tweens.add({
                    targets: mushroom,
                    alpha: 0.8,
                    scale: 1.2,
                    duration: 500,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => mushroom.destroy()
                });
                
                // Create a custom timed explosion with mushroom-themed colors
                createCustomTimedExplosion(scene, mushroomX, mushroomY, mushroomRadius, explosionDelay, damage, 0xFF69B4);
                mushroomsPlaced++;
            }
            
            // Helper function for custom timed explosion with mushroom colors
            function createCustomTimedExplosion(scene, x, y, radius, delay, damage, color) {
                // Create visual indicator for the timed bomb (mushroom-themed)
                const indicator = scene.add.graphics();
                indicator.fillStyle(color, 0.3); // Using mushroom color instead of red
                indicator.fillCircle(x, y, radius);
                
                // Add countdown effect
                const countdownText = scene.add.text(x, y, (delay / 1000).toFixed(1), {
                    fontSize: '24px',
                    fontFamily: 'Arial',
                    fill: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);
                
                // Pulsing effect for the indicator
                scene.tweens.add({
                    targets: indicator,
                    alpha: 0.6,
                    scale: 1.1,
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
                
                // Update countdown text
                let remainingTime = delay;
                const updateInterval = 100; // Update every 100ms
                const countdownTimer = scene.time.addEvent({
                    delay: updateInterval,
                    callback: () => {
                        remainingTime -= updateInterval;
                        countdownText.setText((remainingTime / 1000).toFixed(1));
                    },
                    repeat: Math.floor(delay / updateInterval) - 1
                });
                
                // Trigger explosion after delay
                scene.time.delayedCall(delay, () => {
                    // Stop and clean up countdown elements
                    if (countdownTimer && countdownTimer.active) countdownTimer.remove();
                    indicator.destroy();
                    countdownText.destroy();
                    
                    // Create explosion effect with mushroom color
                    const explosion = scene.add.graphics();
                    explosion.fillStyle(color, 0.7); // Using mushroom color
                    explosion.fillCircle(x, y, radius);
                    
                    // Add particle effect with mushroom color
                    const particles = scene.add.particles(x, y, 'particle', {
                        speed: { min: 50, max: 200 },
                        scale: { start: 1, end: 0 },
                        lifespan: 800,
                        quantity: 30,
                        tint: [color, 0xFFAADD, 0xFFDDEE], // Mushroom-themed particle colors
                        blendMode: 'ADD',
                        emitting: false
                    });
                    
                    particles.explode(30);
                    
                    // Camera shake effect
                    scene.cameras.main.shake(300, 0.01);
                    
                    // Damage enemies within radius
                    scene.enemies.getChildren().forEach(enemy => {
                        if (!enemy.active) return;
                        
                        const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                        if (distance <= radius) {
                            // Apply damage
                            if (enemy.damage) {
                                enemy.damage(damage);
                            } else {
                                enemy.health -= damage;
                            }
                            
                            // Add knockback effect
                            const angle = Phaser.Math.Angle.Between(x, y, enemy.x, enemy.y);
                            const knockbackForce = 200 * (1 - distance / radius); // More force closer to center
                            
                            if (enemy.body) {
                                enemy.body.velocity.x += Math.cos(angle) * knockbackForce;
                                enemy.body.velocity.y += Math.sin(angle) * knockbackForce;
                            }
                        }
                    });
                    
                    // Fade out and cleanup
                    scene.tweens.add({
                        targets: explosion,
                        alpha: 0,
                        scale: 1.5,
                        duration: 500,
                        onComplete: () => {
                            explosion.destroy();
                            scene.time.delayedCall(800, () => {
                                if (particles && particles.active) particles.destroy();
                            });
                        }
                    });
                });
            }
            
            return mushroomsPlaced > 0;
        }
    },
    thunderMage: {
        name: 'Thunder Mage',
        color: 0x7DF9FF, // Electric Blue
        ability: 'Thunder Strike',
        description: 'Calls down lightning bolts from above',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;
            
            const strikeCount = 4;
            const targetEnemies = Phaser.Utils.Array.Shuffle(enemies.getChildren().filter(e => e.active)).slice(0, strikeCount);
            
            targetEnemies.forEach((enemy, index) => {
                // Stagger the strikes slightly
                scene.time.delayedCall(index * 150, () => {
                    if (!enemy.active) return;

                    const warningCircle = scene.add.graphics();
                    warningCircle.fillStyle(0x7DF9FF, 0.3);
                    warningCircle.fillCircle(enemy.x, enemy.y, TILE_SIZE * 1.5);
                    scene.tweens.add({ targets: warningCircle, alpha: 0.7, duration: 300, yoyo: true, repeat: 1, onComplete: () => warningCircle.destroy() });

                    scene.time.delayedCall(700, () => { // Delay strike after warning
                        if (!enemy.active) return;

                        const strikeHeight = 300;
                        const lightning = scene.add.graphics();
                        lightning.lineStyle(3, 0xFFFFFF, 1);
                        helpers.createJaggedLine(lightning, enemy.x, enemy.y - strikeHeight, enemy.x, enemy.y, 6, 20);
                        
                        const glow = scene.add.graphics();
                        glow.lineStyle(9, 0x7DF9FF, 0.5);
                        glow.strokeLineShape(new Phaser.Geom.Line(enemy.x, enemy.y - strikeHeight, enemy.x, enemy.y));

                        const flash = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xFFFFFF, 0.2);
                        scene.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() });

                        const impact = scene.add.graphics();
                        impact.fillStyle(0xFFFFFF, 0.8);
                        impact.fillCircle(enemy.x, enemy.y, TILE_SIZE);

                        const emitter = scene.add.particles(enemy.x, enemy.y, 'particle', {
                            speed: { min: 50, max: 150 }, scale: { start: 0.5, end: 0 },
                            lifespan: 500, quantity: 20, tint: [0x7DF9FF, 0xFFFFFF],
                            emitting: false // Don't start emitting
                        });
                         if (!emitter) return;

                        emitter.explode(); // Fire once
                        // Destroy after lifespan
                        scene.time.delayedCall(500, () => { if (emitter) emitter.destroy(); });
                        
                        helpers.damageEnemy(scene, enemy, 4);
                        
                        // Chain damage
                        const chainRange = TILE_SIZE * 2;
                        const lightningArray = [];
                        enemies.getChildren().forEach(nearbyEnemy => {
                            if (nearbyEnemy.active && nearbyEnemy !== enemy) {
                                const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, nearbyEnemy.x, nearbyEnemy.y);
                                if (distance < chainRange) {
                                    helpers.damageEnemy(scene, nearbyEnemy, 2);
                                    helpers.createLightningEffect(scene, enemy.x, enemy.y, nearbyEnemy.x, nearbyEnemy.y, lightningArray);
                                }
                            }
                        });
                        scene.time.delayedCall(200, () => lightningArray.forEach(l => l.destroy()));

                        scene.time.delayedCall(200, () => { lightning.destroy(); glow.destroy(); impact.destroy(); });
                    });
                });
            });
            return true;
        }
    },
    goblinTrapper: {
        name: 'Goblin Trapper',
        color: 0x32CD32, // Lime Green
        ability: 'Temporal Mine',
        description: 'Places explosive mines that damage enemies',
        specialAttack: function(scene, follower, enemies, helpers) {
            const mineCount = 3;
            let minesPlaced = 0;
            
            // Mine properties
            const mineRadius = TILE_SIZE * 1.5;
            const explosionDelay = 8000;
            const damage = 4;
            
            for (let i = 0; i < mineCount; i++) {
                const angle = (Math.PI * 2 / mineCount) * i + Math.random() * 0.5 - 0.25; // Add some randomness
                const distance = TILE_SIZE * Phaser.Math.Between(2, 4);
                let mineX = Phaser.Math.Clamp(follower.x + Math.cos(angle) * distance, TILE_SIZE, GAME_WIDTH - TILE_SIZE);
                let mineY = Phaser.Math.Clamp(follower.y + Math.sin(angle) * distance, TILE_SIZE, GAME_HEIGHT - TILE_SIZE);
                
                // Create mine visual - this replaces the red circle visual from createTimedExplosion
                const mine = scene.add.graphics();
                mine.lineStyle(2, 0x32CD32, 1);
                mine.strokeCircle(mineX, mineY, mineRadius * 0.4);
                mine.fillStyle(0x32CD32, 0.3);
                mine.fillCircle(mineX, mineY, mineRadius * 0.4);
                
                // Add countdown text
                const countdownText = scene.add.text(mineX, mineY, (explosionDelay / 1000).toFixed(1), {
                    fontSize: '20px',
                    fontFamily: 'Arial',
                    fill: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);
                
                // Blinking effect
                scene.tweens.add({
                    targets: mine,
                    alpha: 0.1,
                    duration: 500,
                    yoyo: true,
                    repeat: Math.floor(explosionDelay / 1000) - 1
                });
                
                // Update countdown text
                const updateInterval = 1000; // Update every second
                const countdownTimer = scene.time.addEvent({
                    delay: updateInterval,
                    callback: () => {
                        const remainingTime = Math.max(0, (countdownTimer.getOverallRemaining() / 1000)).toFixed(1);
                        countdownText.setText(remainingTime);
                    },
                    repeat: Math.floor(explosionDelay / updateInterval) - 1
                });
                
                // Trigger explosion after delay
                scene.time.delayedCall(explosionDelay, () => {
                    // Clean up visuals
                    mine.destroy();
                    countdownText.destroy();
                    
                    // Create explosion effect with green color
                    const explosion = scene.add.graphics();
                    explosion.fillStyle(0x32CD32, 0.7); // Use green instead of red
                    explosion.fillCircle(mineX, mineY, mineRadius);
                    
                    // Add particles
                    const particles = scene.add.particles(mineX, mineY, 'particle', {
                        speed: { min: 50, max: 200 },
                        scale: { start: 1, end: 0 },
                        lifespan: 800,
                        quantity: 30,
                        tint: [0x32CD32, 0x228B22, 0x006400], // Green colors
                        blendMode: 'ADD',
                        emitting: false
                    });
                    
                    particles.explode(30);
                    
                    // Camera shake effect
                    scene.cameras.main.shake(300, 0.01);
                    
                    // Damage enemies within radius
                    scene.enemies.getChildren().forEach(enemy => {
                        if (!enemy.active) return;
                        
                        const distance = Phaser.Math.Distance.Between(mineX, mineY, enemy.x, enemy.y);
                        if (distance <= mineRadius) {
                            // Apply damage
                            helpers.damageEnemy(scene, enemy, damage);
                            
                            // Add knockback effect
                            const angle = Phaser.Math.Angle.Between(mineX, mineY, enemy.x, enemy.y);
                            const knockbackForce = 200 * (1 - distance / mineRadius);
                            
                            if (enemy.body) {
                                enemy.body.velocity.x += Math.cos(angle) * knockbackForce;
                                enemy.body.velocity.y += Math.sin(angle) * knockbackForce;
                            }
                        }
                    });
                    
                    // Fade out and cleanup
                    scene.tweens.add({
                        targets: explosion,
                        alpha: 0,
                        scale: 1.5,
                        duration: 500,
                        onComplete: () => {
                            explosion.destroy();
                            scene.time.delayedCall(800, () => {
                                if (particles && particles.active) particles.destroy();
                            });
                        }
                    });
                });
                
                minesPlaced++;
            }
            return minesPlaced > 0;
        }
    },
    shaman: {
        name: 'Shaman',
        color: 0x556B2F, // Dark Olive Green
        ability: 'Corrosion Cloud',
        description: 'Creates poisonous clouds that damage enemies over time',
        specialAttack: function(scene, follower, enemies, helpers) {
            if (enemies.getLength() === 0) return false;
            
            // Max distance the cloud can be placed from the shaman
            const maxDistanceFromShaman = TILE_SIZE * 4;
            const cloudRadius = TILE_SIZE * 3;
            
            // Find densest cluster of enemies, but only consider enemies near the shaman
            let bestLocation = { x: follower.x, y: follower.y };
            let maxScore = -1;
            
            // Get nearby enemies
            const nearbyEnemies = enemies.getChildren().filter(e => 
                e.active && Phaser.Math.Distance.Between(follower.x, follower.y, e.x, e.y) <= maxDistanceFromShaman
            );
            
            // If no nearby enemies, place cloud at shaman's position
            if (nearbyEnemies.length === 0) {
                scene.createPoisonCloud(follower.x, follower.y, cloudRadius);
                return true;
            }
            
            // Check around nearby enemies for the densest cluster
            nearbyEnemies.forEach(center => {
                let score = 0;
                enemies.getChildren().forEach(enemy => {
                    if (enemy.active && Phaser.Math.Distance.Between(center.x, center.y, enemy.x, enemy.y) <= cloudRadius) {
                        score++;
                    }
                });
                
                // Also consider distance from shaman (prefer closer locations)
                const distanceFromShaman = Phaser.Math.Distance.Between(follower.x, follower.y, center.x, center.y);
                if (distanceFromShaman <= maxDistanceFromShaman && score > maxScore) {
                    maxScore = score;
                    bestLocation = { x: center.x, y: center.y };
                }
            });
            
            // Clamp location to game bounds
            bestLocation.x = Phaser.Math.Clamp(bestLocation.x, cloudRadius, GAME_WIDTH - cloudRadius);
            bestLocation.y = Phaser.Math.Clamp(bestLocation.y, cloudRadius, GAME_HEIGHT - cloudRadius);

            // Final check to ensure cloud is within max distance
            const finalDistance = Phaser.Math.Distance.Between(follower.x, follower.y, bestLocation.x, bestLocation.y);
            if (finalDistance > maxDistanceFromShaman) {
                // If too far, move the cloud position closer to the shaman
                const angle = Phaser.Math.Angle.Between(follower.x, follower.y, bestLocation.x, bestLocation.y);
                bestLocation.x = follower.x + Math.cos(angle) * maxDistanceFromShaman;
                bestLocation.y = follower.y + Math.sin(angle) * maxDistanceFromShaman;
                
                // Clamp again after adjustment
                bestLocation.x = Phaser.Math.Clamp(bestLocation.x, cloudRadius, GAME_WIDTH - cloudRadius);
                bestLocation.y = Phaser.Math.Clamp(bestLocation.y, cloudRadius, GAME_HEIGHT - cloudRadius);
            }

            // Add a visual indicator showing connection between shaman and cloud
            const connector = scene.add.graphics();
            connector.lineStyle(3, 0x556B2F, 0.6);
            connector.lineBetween(follower.x, follower.y, bestLocation.x, bestLocation.y);
            scene.tweens.add({
                targets: connector,
                alpha: 0,
                duration: 1000,
                onComplete: () => connector.destroy()
            });

            scene.createPoisonCloud(bestLocation.x, bestLocation.y, cloudRadius);
            return true;
        }
    }
}; 