// Snake Survivors - Inline asset generator
// This will generate the game assets at runtime using Canvas

// Function to create a white pixel
function createWhitePixelTexture(scene) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xFFFFFF);
    graphics.fillRect(0, 0, 1, 1);
    graphics.generateTexture('pixel', 1, 1);
    graphics.destroy();
}

// Function to create the player texture (triangle shape)
function createPlayerTexture(scene) {
    const width = 16;
    const height = 16;
    
    const graphics = scene.add.graphics({ x: 0, y: 0 });
    
    // Draw player body (triangle shape for snake head)
    graphics.fillStyle(0xFFFFFF);
    graphics.beginPath();
    graphics.moveTo(4, 4);
    graphics.lineTo(12, 8);
    graphics.lineTo(4, 12);
    graphics.closePath();
    graphics.fillPath();
    
    // Draw eye
    graphics.fillStyle(0x000000);
    graphics.fillRect(9, 7, 2, 2);
    
    // Generate texture
    graphics.generateTexture('player', width, height);
    graphics.destroy();
}

// Function to create the follower texture
function createFollowerTexture(scene) {
    const width = 16;
    const height = 16;
    
    const graphics = scene.add.graphics({ x: 0, y: 0 });
    
    // Draw follower (rounded rectangle)
    graphics.fillStyle(0xFFFFFF);
    graphics.fillRoundedRect(4, 4, 8, 8, 2);
    
    // Generate texture
    graphics.generateTexture('follower', width, height);
    graphics.destroy();
}

// Function to create the enemy texture
function createEnemyTexture(scene) {
    const width = 16;
    const height = 16;
    
    const graphics = scene.add.graphics({ x: 0, y: 0 });
    
    // Draw enemy (spiky circle)
    graphics.fillStyle(0xFFFFFF);
    
    // Base circle
    graphics.beginPath();
    graphics.arc(8, 8, 5, 0, Math.PI * 2);
    graphics.fillPath();
    
    // Spikes
    graphics.lineStyle(1.5, 0xFFFFFF);
    const spikes = 8;
    const spikeLength = 2;
    
    for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const x1 = 8 + Math.cos(angle) * 5;
        const y1 = 8 + Math.sin(angle) * 5;
        const x2 = 8 + Math.cos(angle) * (5 + spikeLength);
        const y2 = 8 + Math.sin(angle) * (5 + spikeLength);
        
        graphics.beginPath();
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();
    }
    
    // Generate texture
    graphics.generateTexture('enemy', width, height);
    graphics.destroy();
}

// Function to create the pickup texture
function createPickupTexture(scene) {
    const width = 16;
    const height = 16;
    
    const graphics = scene.add.graphics({ x: 0, y: 0 });
    
    // Draw pickup (gem shape)
    graphics.fillStyle(0xFFFFFF);
    
    // Diamond shape
    graphics.beginPath();
    graphics.moveTo(8, 3);  // Top
    graphics.lineTo(13, 8); // Right
    graphics.lineTo(8, 13); // Bottom
    graphics.lineTo(3, 8);  // Left
    graphics.closePath();
    graphics.fillPath();
    
    // Inner highlight
    graphics.fillStyle(0xBBBBBB);
    graphics.beginPath();
    graphics.moveTo(8, 5);
    graphics.lineTo(11, 8);
    graphics.lineTo(8, 11);
    graphics.lineTo(5, 8);
    graphics.closePath();
    graphics.fillPath();
    
    // Generate texture
    graphics.generateTexture('pickup', width, height);
    graphics.destroy();
}

// Function to create the bullet texture
function createBulletTexture(scene) {
    const width = 8;
    const height = 8;
    
    const graphics = scene.add.graphics({ x: 0, y: 0 });
    
    // Draw bullet (small oval)
    graphics.fillStyle(0xFFFFFF);
    
    // Draw an oval
    graphics.fillEllipse(4, 4, 6, 4);
    
    // Generate texture
    graphics.generateTexture('bullet', width, height);
    graphics.destroy();
}

// Function to create the particle texture
function createParticleTexture(scene) {
    const width = 4;
    const height = 4;
    
    const graphics = scene.add.graphics({ x: 0, y: 0 });
    
    // Draw particle (small square)
    graphics.fillStyle(0xFFFFFF);
    graphics.fillRect(0, 0, width, height);
    
    // Generate texture
    graphics.generateTexture('particle', width, height);
    graphics.destroy();
}

// Main function to create all textures
function createGameTextures(scene) {
    createWhitePixelTexture(scene);
    createPlayerTexture(scene);
    createFollowerTexture(scene);
    createEnemyTexture(scene);
    createPickupTexture(scene);
    createBulletTexture(scene);
    createParticleTexture(scene);
} 