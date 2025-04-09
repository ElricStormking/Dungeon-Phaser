import { TILE_SIZE } from '../constants.js';

// Create all game textures during preload
export function createGameTextures(scene) {
    console.log('Creating game textures...');
    
    // Create a pixel texture for particles
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 4;
    particleCanvas.height = 4;
    const particleCtx = particleCanvas.getContext('2d');
    particleCtx.fillStyle = '#FFFFFF';
    particleCtx.fillRect(0, 0, 4, 4);
    
    // Create basic shapes for the game
    scene.textures.addCanvas('particle', particleCanvas); // Use addCanvas instead of addBase64
    
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
    scene.textures.addCanvas('player', playerCanvas);
    
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
    scene.textures.addCanvas('follower', followerCanvas);
    
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
    scene.textures.addCanvas('enemy', enemyCanvas);
    
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
    scene.textures.addCanvas('pickup', pickupCanvas);
    
    // Create bullet texture
    const bulletCanvas = document.createElement('canvas');
    bulletCanvas.width = TILE_SIZE/2;
    bulletCanvas.height = TILE_SIZE/2;
    const bulletCtx = bulletCanvas.getContext('2d');
    bulletCtx.fillStyle = '#FFFF00';
    bulletCtx.beginPath();
    bulletCtx.arc(TILE_SIZE/4, TILE_SIZE/4, TILE_SIZE/4-1, 0, Math.PI*2);
    bulletCtx.fill();
    scene.textures.addCanvas('bullet', bulletCanvas);
    
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
    scene.textures.addCanvas('arrow', arrowCanvas);
    
    console.log('Game textures created successfully!');
} 