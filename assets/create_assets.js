// Script to generate pixel art assets for our game
const fs = require('fs');

// Canvas setup for drawing pixels
function setupCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
    return { canvas, ctx };
}

// Export canvas to PNG
function exportCanvas(canvas, filename) {
    const dataUrl = canvas.toDataURL('image/png');
    const data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filename, buffer);
    console.log(`Created ${filename}`);
}

// Create player sprite (16x16 pixel art character)
function createPlayerSprite() {
    const { canvas, ctx } = setupCanvas(16, 16);
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 16, 16);
    ctx.clearRect(0, 0, 16, 16);
    
    // Draw player body (triangle shape for snake head)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(12, 8);
    ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();
    
    // Draw eye
    ctx.fillStyle = '#000000';
    ctx.fillRect(9, 7, 2, 2);
    
    exportCanvas(canvas, 'assets/player.png');
}

// Create follower sprite (follower segment)
function createFollowerSprite() {
    const { canvas, ctx } = setupCanvas(16, 16);
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 16, 16);
    ctx.clearRect(0, 0, 16, 16);
    
    // Draw follower (square with rounded corners)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(4, 4, 8, 8, 2);
    ctx.fill();
    
    exportCanvas(canvas, 'assets/follower.png');
}

// Create enemy sprite
function createEnemySprite() {
    const { canvas, ctx } = setupCanvas(16, 16);
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 16, 16);
    ctx.clearRect(0, 0, 16, 16);
    
    // Draw enemy (spiky circle)
    ctx.fillStyle = '#FFFFFF';
    
    // Base circle
    ctx.beginPath();
    ctx.arc(8, 8, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Spikes
    const spikes = 8;
    const spikeLength = 2;
    
    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const x1 = 8 + Math.cos(angle) * 5;
        const y1 = 8 + Math.sin(angle) * 5;
        const x2 = 8 + Math.cos(angle) * (5 + spikeLength);
        const y2 = 8 + Math.sin(angle) * (5 + spikeLength);
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    exportCanvas(canvas, 'assets/enemy.png');
}

// Create pickup sprite
function createPickupSprite() {
    const { canvas, ctx } = setupCanvas(16, 16);
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 16, 16);
    ctx.clearRect(0, 0, 16, 16);
    
    // Draw pickup (gem shape)
    ctx.fillStyle = '#FFFFFF';
    
    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(8, 3);  // Top
    ctx.lineTo(13, 8); // Right
    ctx.lineTo(8, 13); // Bottom
    ctx.lineTo(3, 8);  // Left
    ctx.closePath();
    ctx.fill();
    
    // Inner highlight
    ctx.fillStyle = '#BBBBBB';
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.lineTo(11, 8);
    ctx.lineTo(8, 11);
    ctx.lineTo(5, 8);
    ctx.closePath();
    ctx.fill();
    
    exportCanvas(canvas, 'assets/pickup.png');
}

// Create bullet sprite
function createBulletSprite() {
    const { canvas, ctx } = setupCanvas(8, 8);
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 8, 8);
    ctx.clearRect(0, 0, 8, 8);
    
    // Draw bullet (small oval)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(4, 4, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    exportCanvas(canvas, 'assets/bullet.png');
}

// Create particle sprite
function createParticleSprite() {
    const { canvas, ctx } = setupCanvas(4, 4);
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 4, 4);
    ctx.clearRect(0, 0, 4, 4);
    
    // Draw particle (small square)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 4, 4);
    
    exportCanvas(canvas, 'assets/particle.png');
}

// Create all assets
createPlayerSprite();
createFollowerSprite();
createEnemySprite();
createPickupSprite();
createBulletSprite();
createParticleSprite(); 