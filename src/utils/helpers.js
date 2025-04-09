import { TILE_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

// --- Damage & Effects ---

// Consolidated damage function (assumes scene has necessary properties like player, enemies, followers, score etc.)
export function damageCharacter(scene, character, amount) {
    if (!character || !character.active) return;

    character.health = (character.health || 0) - amount;

    // Damage Text
    const damageText = scene.add.text(character.x, character.y - 15, amount.toString(), {
        fontSize: '14px', fontFamily: 'Arial', fill: '#FFFFFF',
        stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(character.depth + 2); // Ensure text is on top
    scene.tweens.add({
        targets: damageText,
        y: damageText.y - 20,
        alpha: 0,
        duration: 600,
        ease: 'Power1',
        onComplete: () => damageText.destroy()
    });

    updateHealthBar(scene, character);

    if (character.health <= 0) {
        handleCharacterDeath(scene, character); // Separate death logic
    } else {
        // Damage Flash
        scene.tweens.add({
            targets: character,
            alpha: 0.5,
            duration: 80,
            yoyo: true,
            onComplete: () => { if(character.active) character.setAlpha(1); } // Ensure alpha reset
        });
    }
}

// Handles death logic for any character (player, enemy, follower)
function handleCharacterDeath(scene, character) {
     if (character === scene.player) {
        scene.handleGameOver(); // Call scene method for game over
    } else {
        createExplosion(scene, character.x, character.y, character.tintTopLeft || 0xFFFFFF); 

        // Check if it's an enemy
        if (scene.enemies && scene.enemies.contains(character)) { 
            scene.score = (scene.score || 0) + (character.scoreValue || 5);
            if(scene.scoreText) scene.scoreText.setText('Score: ' + scene.score);
            scene.addExperience(character.experienceValue || 10); // Call scene method for EXP
            scene.enemies.remove(character, true, true); 
        } 
        // Check if it's a follower (assuming followers are now in a group)
        else if (scene.followersGroup && scene.followersGroup.contains(character)) {
            // Find the index in the snake array for movement logic updates
             const followerIndex = scene.followers.indexOf(character);
              if (followerIndex !== -1) {
                 scene.followers.splice(followerIndex, 1);
             }
             scene.followersGroup.remove(character, true, true); 
         }
         // Default destroy if not found in expected groups (e.g., temporary sprites)
         else {
            if (character.healthBar) character.healthBar.destroy();
            character.destroy();
         }
    }
}

// Simplified damageEnemy calls damageCharacter
export function damageEnemy(scene, enemy, amount) {
     damageCharacter(scene, enemy, amount);
}

// --- Visual Effects ---

export function createExplosion(scene, x, y, color = 0xFFFFFF) {
    // Correct Phaser 3.60+ syntax for particles
    const emitter = scene.add.particles(x, y, 'particle', {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        lifespan: { min: 300, max: 500 }, // Add some variance
        quantity: 15,
        tint: color,
        blendMode: 'ADD',
        emitting: false // Create emitter but don't start emission automatically
    });

    if (!emitter) return; 

    emitter.explode(15); // Explode particles once

    // Automatically clean up the emitter after its lifespan
    // Option 1: Use a timer (simple)
    scene.time.delayedCall(500, () => {
        if (emitter) emitter.destroy(); // Destroy the emitter itself
    });
    // Option 2: Listen for emitter completion (more robust if lifespan varies a lot)
    // emitter.onParticleEmitComplete = () => emitter.destroy(); 
    // Note: onParticleEmitComplete might not exist; check docs if needed.
    // Using lifespan + timer is generally reliable for simple explosions.
}

export function createLightningEffect(scene, x1, y1, x2, y2) {
    const segments = Phaser.Math.Between(5, 10);
    const jitter = 10;
    const line = scene.add.graphics();
    line.lineStyle(Phaser.Math.Between(1, 3), 0x00FFFF, 0.8);
    line.setDepth(10); // Ensure visibility
    line.beginPath();
    line.moveTo(x1, y1);

    for (let i = 1; i < segments; i++) {
        const nx = Phaser.Math.Linear(x1, x2, i / segments);
        const ny = Phaser.Math.Linear(y1, y2, i / segments);
        line.lineTo(nx + Phaser.Math.FloatBetween(-jitter, jitter), ny + Phaser.Math.FloatBetween(-jitter, jitter));
    }
    line.lineTo(x2, y2);
    line.strokePath();
    
    scene.tweens.add({targets: line, alpha: 0, duration: 250, delay: 50, onComplete: ()=> line.destroy()});
}

// Helper for jagged lines (used by Thunder Mage)
export function createJaggedLine(graphics, x1, y1, x2, y2, segments, jitter) {
    graphics.beginPath();
    graphics.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
        const progress = i / segments;
        const nx = Phaser.Math.Linear(x1, x2, progress);
        const ny = Phaser.Math.Linear(y1, y2, progress);
        graphics.lineTo(
            nx + Phaser.Math.Between(-jitter, jitter) * (1 - progress), 
            ny + Phaser.Math.Between(-jitter, jitter) * (1 - progress)
        );
    }
    graphics.lineTo(x2, y2);
    graphics.strokePath();
}

export function updateHealthBar(scene, character) {
    if (!character.active || character.health === undefined || character.maxHealth === undefined) return;
    
    // Create health bar if it doesn't exist
    if (!character.healthBar) {
        character.healthBar = scene.add.graphics();
        // Ensure it's destroyed when character is
        character.on('destroy', () => { if (character.healthBar) character.healthBar.destroy(); });
    }

    const healthBar = character.healthBar;
    healthBar.clear();

    const barWidth = TILE_SIZE * 0.8;
    const barHeight = 3;
    const barX = character.x - barWidth / 2;
    const barY = character.y - TILE_SIZE / 2 - barHeight - 1;
    const healthRatio = Math.max(0, character.health / character.maxHealth);

    // Background
    healthBar.fillStyle(0x8B0000, 0.7);
    healthBar.fillRect(barX, barY, barWidth, barHeight);
    // Foreground
    if (healthRatio > 0) {
        healthBar.fillStyle(0x00FF00, 0.9);
        healthBar.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    }
    healthBar.setDepth(character.depth + 1); 
}

// --- Utility ---

export function setAngleFromDirection(sprite, direction) {
     switch (direction) {
        case 'left': sprite.angle = 180; break;
        case 'right': sprite.angle = 0; break;
        case 'up': sprite.angle = -90; break;
        case 'down': sprite.angle = 90; break;
    }
}

// --- Placeholder/Complex Ability Helpers (Require specific logic not suitable for generic helper) ---

// These functions (explodeMushroom, explodeMine, applyPoison, createPoisonCloud, createTimedExplosion)
// involve specific game logic (poison timers, knockback, unique particle effects) 
// tightly coupled to the engineer classes. They are better implemented either:
// 1. Directly within the engineerClasses specialAttack functions.
// 2. As private methods within the GameScene if they need to interact with multiple scene systems.
// Keeping them separate requires passing too much context (enemies group, specific particle configs etc.)

// Example: Removing explodeMushroom - its logic should be called from Shroom Pixie's attack 