import { TILE_SIZE } from '../constants.js';
// TODO: Import or pass shootProjectile and createExplosion

// Hero classes with different abilities
export const heroClasses = {
    warrior: {
        name: 'Warrior',
        color: 0x00FFFF, // Note: TitleScene uses 0xFF0000, game uses 0x00FFFF. Standardize?
        specialAttack: function(scene, player, enemies, helpers) { // Pass needed functions/data
            // Sword sweep (damages all nearby enemies)
            const range = TILE_SIZE * 3;
            let enemiesHit = 0;
            
            for (let i = 0; i < enemies.getLength(); i++) { // Assuming enemies is a Group
                const enemy = enemies.getChildren()[i];
                const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
                
                if (distance <= range) {
                    helpers.createExplosion(scene, enemy.x, enemy.y, 0xFFFF00);
                    // Damage enemy instead of just destroying
                    helpers.damageEnemy(scene, enemy, 5); // Example damage value
                    // Let damageEnemy handle destruction & score
                    enemiesHit++;
                    // Reset loop index if enemy is destroyed by damageEnemy
                    // (Need to adjust if damageEnemy doesn't remove immediately)
                    // i--; 
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
        specialAttack: function(scene, player, enemies, helpers) { // helpers param is no longer needed here
            // Fire arrows in 8 directions
            const directions = [
                {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}, {x: -1, y: 1},
                {x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}
            ];
            
            directions.forEach(dir => {
                scene.shootProjectile(player.x, player.y, dir.x, dir.y, 'arrow');
            });
            
            return true;
        }
    },
    mage: {
        name: 'Mage',
        color: 0xFF00FF, // Note: TitleScene uses 0x00FFFF, game uses 0xFF00FF. Standardize?
        specialAttack: function(scene, player, enemies, helpers) { // Pass needed functions/data
            // Freeze all enemies temporarily
            if (enemies.getLength() === 0) return false;
            
            enemies.getChildren().forEach(enemy => {
                if (!enemy.active) return; // Check if enemy is active
                
                // Store original speed if not already frozen
                 if (!enemy.isFrozen) { 
                    // Visual effect
                    enemy.setTint(0x00FFFF);
                    enemy.isFrozen = true; // Custom flag to manage state

                    if (!enemy.originalSpeed) {
                        enemy.originalSpeed = enemy.speed; // Assuming speed property exists
                    }

                    // Stop enemy
                    enemy.body.velocity.x = 0;
                    enemy.body.velocity.y = 0;
                    enemy.speed = 0; // Update speed property if used
                    
                    // Unfreeze after a delay
                    scene.time.delayedCall(2000, () => {
                        if (enemy.active) {
                            enemy.clearTint();
                            enemy.isFrozen = false;
                            // Restore original movement toward player (if it has speed)
                            if (enemy.originalSpeed) { 
                                enemy.speed = enemy.originalSpeed; 
                                scene.physics.moveToObject(enemy, player, enemy.speed); 
                            } 
                        }
                    });
                }
            });
            
            return true;
        }
    }
}; 