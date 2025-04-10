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
    
    // Create terrain textures
    createTerrainTextures(scene);
    
    console.log('Game textures created successfully!');
}

/**
 * Create textures for terrain tiles
 * @param {Phaser.Scene} scene - The scene to add textures to
 */
function createTerrainTextures(scene) {
    const TILE_SIZE = 16; // Match the tile size in constants.js
    
    // Create texture for meadow (75% dark grey floor, 25% grass)
    const meadowCanvas = document.createElement('canvas');
    meadowCanvas.width = TILE_SIZE;
    meadowCanvas.height = TILE_SIZE;
    const meadowCtx = meadowCanvas.getContext('2d');
    
    // Base dark grey floor
    meadowCtx.fillStyle = '#333333'; // Dark grey instead of brown dirt
    meadowCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // Add grass patches (25% of the tile)
    meadowCtx.fillStyle = '#228B22'; // Forest green
    
    // Add four small grass patches in different areas
    const grassPatches = [
        {x: 1, y: 1, w: 4, h: 4},
        {x: TILE_SIZE - 5, y: 2, w: 3, h: 5},
        {x: 3, y: TILE_SIZE - 6, w: 6, h: 3},
        {x: TILE_SIZE - 7, y: TILE_SIZE - 4, w: 5, h: 2}
    ];
    
    // Only draw some of these patches randomly to vary the look
    grassPatches.forEach(patch => {
        if (Math.random() < 0.7) { // 70% chance to draw each patch
            meadowCtx.fillRect(patch.x, patch.y, patch.w, patch.h);
        }
    });
    
    // Add some grass highlights
    meadowCtx.fillStyle = '#32CD32'; // Lime green
    for (let i = 0; i < 3; i++) {
        const x = Math.random() * TILE_SIZE;
        const y = Math.random() * TILE_SIZE;
        const size = 1 + Math.random() * 2;
        meadowCtx.fillRect(x, y, size, size);
    }
    scene.textures.addCanvas('meadow_tile', meadowCanvas);
    
    // Create texture for bush
    const bushCanvas = document.createElement('canvas');
    bushCanvas.width = TILE_SIZE;
    bushCanvas.height = TILE_SIZE;
    const bushCtx = bushCanvas.getContext('2d');
    
    // Dark green background with texture
    bushCtx.fillStyle = '#228B22'; // Forest green background
    bushCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // Add texture to the background
    bushCtx.fillStyle = '#1E7A1E'; // Slightly darker green for texture
    for (let i = 0; i < 12; i++) {
        const x = Math.random() * TILE_SIZE;
        const y = Math.random() * TILE_SIZE;
        const size = 1 + Math.random() * 2;
        bushCtx.fillRect(x, y, size, size);
    }
    
    // Draw multiple small bush clumps instead of one large one
    bushCtx.fillStyle = '#006400'; // Dark green for bushes
    
    // Add 3-4 bush clusters instead of just one
    const clumpCount = 3 + Math.floor(Math.random() * 2);
    const positions = [
        {x: TILE_SIZE/3, y: TILE_SIZE/3, r: TILE_SIZE/5},
        {x: 2*TILE_SIZE/3, y: TILE_SIZE/3, r: TILE_SIZE/6},
        {x: TILE_SIZE/3, y: 2*TILE_SIZE/3, r: TILE_SIZE/6},
        {x: 2*TILE_SIZE/3, y: 2*TILE_SIZE/3, r: TILE_SIZE/5}
    ];
    
    // Draw each bush clump
    for (let i = 0; i < clumpCount; i++) {
        const pos = positions[i];
        bushCtx.beginPath();
        bushCtx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
        bushCtx.fill();
    }
    
    // Add highlights randomly to bush clumps
    bushCtx.fillStyle = '#90EE90'; // Light green
    for (let i = 0; i < 2; i++) {
        const pos = positions[Math.floor(Math.random() * clumpCount)];
        bushCtx.beginPath();
        bushCtx.arc(pos.x - pos.r/2, pos.y - pos.r/2, pos.r/3, 0, Math.PI * 2);
        bushCtx.fill();
    }
    
    scene.textures.addCanvas('bush_tile', bushCanvas);
    
    // Create texture for forest
    const forestCanvas = document.createElement('canvas');
    forestCanvas.width = TILE_SIZE;
    forestCanvas.height = TILE_SIZE;
    const forestCtx = forestCanvas.getContext('2d');
    forestCtx.fillStyle = '#228B22'; // Forest green background
    forestCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Draw tree trunk
    forestCtx.fillStyle = '#8B4513'; // Brown
    forestCtx.fillRect(TILE_SIZE / 2 - 2, TILE_SIZE / 2, 4, TILE_SIZE / 2);
    // Draw tree top
    forestCtx.fillStyle = '#006400'; // Dark green
    forestCtx.beginPath();
    forestCtx.moveTo(TILE_SIZE / 4, TILE_SIZE / 2);
    forestCtx.lineTo(3 * TILE_SIZE / 4, TILE_SIZE / 2);
    forestCtx.lineTo(TILE_SIZE / 2, TILE_SIZE / 6);
    forestCtx.fill();
    forestCtx.beginPath();
    forestCtx.moveTo(TILE_SIZE / 4 + 2, TILE_SIZE / 2 - 3);
    forestCtx.lineTo(3 * TILE_SIZE / 4 - 2, TILE_SIZE / 2 - 3);
    forestCtx.lineTo(TILE_SIZE / 2, TILE_SIZE / 6 - 5);
    forestCtx.fill();
    scene.textures.addCanvas('forest_tile', forestCanvas);
    
    // Create texture for swamp
    const swampCanvas = document.createElement('canvas');
    swampCanvas.width = TILE_SIZE;
    swampCanvas.height = TILE_SIZE;
    const swampCtx = swampCanvas.getContext('2d');
    swampCtx.fillStyle = '#2F4F4F'; // Dark Slate Gray (murky water)
    swampCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // Add murky water surface effects
    swampCtx.fillStyle = '#3D5B5B'; // Slightly lighter for ripples
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * TILE_SIZE;
        const y = Math.random() * TILE_SIZE;
        const size = 1 + Math.random() * 3;
        swampCtx.fillRect(x, y, size, size);
    }
    
    // Add some swamp grass tufts
    swampCtx.fillStyle = '#006400'; // Dark green
    for (let i = 0; i < 3; i++) {
        const x = Math.random() * TILE_SIZE;
        const y = Math.random() * TILE_SIZE;
        const height = 2 + Math.random() * 3;
        swampCtx.fillRect(x, y, 1, height);
    }
    scene.textures.addCanvas('swamp_tile', swampCanvas);
    
    // Create texture for floor (pure black)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = TILE_SIZE;
    floorCanvas.height = TILE_SIZE;
    const floorCtx = floorCanvas.getContext('2d');
    floorCtx.fillStyle = '#000000'; // Pure black
    floorCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    scene.textures.addCanvas('floor_tile', floorCanvas);
    
    // Create a tileset texture that contains all terrain tiles
    const tilesetCanvas = document.createElement('canvas');
    tilesetCanvas.width = TILE_SIZE * 5; // 5 tile types
    tilesetCanvas.height = TILE_SIZE;
    const tilesetCtx = tilesetCanvas.getContext('2d');
    
    // Draw each tile into the tileset
    tilesetCtx.drawImage(meadowCanvas, 0, 0);
    tilesetCtx.drawImage(bushCanvas, TILE_SIZE, 0);
    tilesetCtx.drawImage(forestCanvas, TILE_SIZE * 2, 0);
    tilesetCtx.drawImage(swampCanvas, TILE_SIZE * 3, 0);
    tilesetCtx.drawImage(floorCanvas, TILE_SIZE * 4, 0);
    
    // Add the tileset to the texture manager
    scene.textures.addCanvas('terrain_tiles', tilesetCanvas);
} 