import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT } from '../constants.js';

// Define terrain types and their IDs
export const TERRAIN = {
    MEADOW: 0,
    BUSH: 1,
    FOREST: 2,
    SWAMP: 3,
    FLOOR: 4
};

/**
 * Manages terrain-related functionality and effects
 */
export default class TerrainSystem {
    constructor(scene) {
        this.scene = scene;
        
        // Store terrain data
        this.terrainLayer = null;
        this.terrainMap = null;
        this.terrainTileset = null;
        
        // Terrain effects settings
        this.effects = {
            [TERRAIN.MEADOW]: { name: 'Meadow', slowFactor: 1.0, damage: 0 },
            [TERRAIN.BUSH]: { name: 'Bush', slowFactor: 0.75, damage: 0 },
            [TERRAIN.FOREST]: { name: 'Forest', slowFactor: 0.5, damage: 0 },
            [TERRAIN.SWAMP]: { name: 'Swamp', slowFactor: 0.9, damage: 1 },
            [TERRAIN.FLOOR]: { name: 'Floor', slowFactor: 1.0, damage: 0 }
        };
    }
    
    /**
     * Create and initialize the terrain
     */
    createTerrain() {
        // Generate the terrain data based on the current level
        this.generateTerrainData();
        
        // Create tilemap from the terrain data
        this.createTilemap();
    }
    
    /**
     * Generate terrain data based on current level
     */
    generateTerrainData() {
        const mapWidthInTiles = Math.ceil(WORLD_WIDTH / TILE_SIZE);
        const mapHeightInTiles = Math.ceil(WORLD_HEIGHT / TILE_SIZE);
        
        // Initialize map with floor terrain (pure black)
        const mapData = Array(mapHeightInTiles).fill().map(() => 
            Array(mapWidthInTiles).fill(TERRAIN.FLOOR)
        );
        
        // Use the current level to influence terrain generation
        const level = this.scene.currentLevel || 1;
        const stage = Math.ceil(level / 8);
        
        // Generate meadow clusters covering approximately 20% of the map
        this.generateMeadowClusters(mapData, mapWidthInTiles, mapHeightInTiles, stage);
        
        // Generate forest clusters
        this.generateForestClusters(mapData, mapWidthInTiles, mapHeightInTiles, stage);
        
        // Generate bushes - some near forests and some clustered in different areas
        this.generateBushes(mapData, mapWidthInTiles, mapHeightInTiles, stage);
        
        // Generate swamps
        this.generateSwamps(mapData, mapWidthInTiles, mapHeightInTiles, stage);
        
        // Always ensure the player spawn area is clear (meadow)
        const centerX = Math.floor(mapWidthInTiles / 2);
        const centerY = Math.floor(mapHeightInTiles / 2);
        
        // Clear a 5x5 area around the center for player spawn
        for (let y = centerY - 2; y <= centerY + 2; y++) {
            for (let x = centerX - 2; x <= centerX + 2; x++) {
                if (y >= 0 && y < mapHeightInTiles && x >= 0 && x < mapWidthInTiles) {
                    mapData[y][x] = TERRAIN.MEADOW;
                }
            }
        }
        
        this.terrainData = mapData;
    }
    
    /**
     * Generate meadow clusters covering approximately 20% of the map
     */
    generateMeadowClusters(mapData, width, height, stage) {
        // Meadow clusters based on stage
        const meadowClusterCount = 3 + stage;
        
        // Meadow cluster size based on stage
        const minClusterSize = 15 + stage * 3;
        const maxClusterSize = 25 + stage * 5;
        
        // Track cluster centers to ensure spacing
        const clusterCenters = [];
        const minClusterDistance = Math.min(width, height) * 0.2; // Minimum distance between clusters
        
        let attempts = 0;
        let clustersCreated = 0;
        
        while (clustersCreated < meadowClusterCount && attempts < meadowClusterCount * 3) {
            attempts++;
            
            // Random cluster center, avoiding edges
            const centerX = Math.floor(width * 0.1) + Math.floor(Math.random() * (width * 0.8));
            const centerY = Math.floor(height * 0.1) + Math.floor(Math.random() * (height * 0.8));
            
            // Check if this is too close to another cluster
            let tooClose = false;
            for (const center of clusterCenters) {
                const distSquared = Math.pow(centerX - center.x, 2) + Math.pow(centerY - center.y, 2);
                if (distSquared < Math.pow(minClusterDistance, 2)) {
                    tooClose = true;
                    break;
                }
            }
            
            // Check if area already has many meadows
            if (!tooClose && this.checkTerrainDensity(mapData, centerX, centerY, maxClusterSize, TERRAIN.MEADOW, width, height)) {
                tooClose = true;
            }
            
            if (tooClose) continue;
            
            // Add this cluster center to the list
            clusterCenters.push({ x: centerX, y: centerY });
            clustersCreated++;
            
            // Random cluster size
            const clusterSize = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize));
            
            // Generate the meadow cluster
            for (let y = centerY - clusterSize/2; y < centerY + clusterSize/2; y++) {
                for (let x = centerX - clusterSize/2; x < centerX + clusterSize/2; x++) {
                    if (y >= 0 && y < height && x >= 0 && x < width) {
                        // Calculate distance from center
                        const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
                        const normalizedDist = distSquared / (clusterSize * clusterSize / 4);
                        
                        // Higher probability near the center, decreasing outward
                        const meadowProb = Math.max(0, 1 - normalizedDist * 1.1);
                        
                        // Add noise for more natural edges
                        const noise = Math.random() * 0.2;
                        
                        if (Math.random() < meadowProb - noise) {
                            mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.MEADOW;
                        }
                    }
                }
            }
            
            // Occasionally create connecting paths between meadow clusters
            if (clustersCreated > 1 && Math.random() < 0.7) {
                const previousCenterIndex = Math.floor(Math.random() * (clusterCenters.length - 1));
                const prevCenter = clusterCenters[previousCenterIndex];
                this.createMeadowPath(mapData, prevCenter.x, prevCenter.y, centerX, centerY, width, height);
            }
        }
        
        // Ensure we have enough meadow - check total coverage
        let meadowCount = 0;
        let totalTiles = width * height;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (mapData[y][x] === TERRAIN.MEADOW) {
                    meadowCount++;
                }
            }
        }
        
        const currentPercentage = meadowCount / totalTiles;
        const targetPercentage = 0.2; // 20% coverage
        
        // If we're significantly under target, add more meadow
        if (currentPercentage < targetPercentage - 0.05) {
            // Add some additional smaller meadow patches
            const additionalPatches = Math.ceil((targetPercentage - currentPercentage) * totalTiles / 100);
            
            for (let p = 0; p < additionalPatches; p++) {
                const patchX = Math.floor(Math.random() * width);
                const patchY = Math.floor(Math.random() * height);
                const patchSize = 3 + Math.floor(Math.random() * 5);
                
                for (let y = patchY - patchSize/2; y < patchY + patchSize/2; y++) {
                    for (let x = patchX - patchSize/2; x < patchX + patchSize/2; x++) {
                        if (y >= 0 && y < height && x >= 0 && x < width) {
                            const dist = Math.sqrt(Math.pow(x - patchX, 2) + Math.pow(y - patchY, 2));
                            if (dist < patchSize/2 && Math.random() < 0.7) {
                                mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.MEADOW;
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Generate forest clusters in the map
     */
    generateForestClusters(mapData, width, height, stage) {
        // Determine how many forest clusters to create based on stage
        const forestClusterCount = 3 + stage;
        
        // Forest cluster size increases with stage
        const minClusterSize = 10 + stage * 5;
        const maxClusterSize = 20 + stage * 10;
        
        for (let c = 0; c < forestClusterCount; c++) {
            // Random cluster center, avoiding map edges
            const centerX = Math.floor(width * 0.2) + Math.floor(Math.random() * (width * 0.6));
            const centerY = Math.floor(height * 0.2) + Math.floor(Math.random() * (height * 0.6));
            
            // Random cluster size
            const clusterSize = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize));
            
            // Generate the forest cluster using a noise-based approach
            for (let y = centerY - clusterSize/2; y < centerY + clusterSize/2; y++) {
                for (let x = centerX - clusterSize/2; x < centerX + clusterSize/2; x++) {
                    if (y >= 0 && y < height && x >= 0 && x < width) {
                        // Calculate distance from cluster center
                        const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
                        const normalizedDist = distSquared / (clusterSize * clusterSize / 4);
                        
                        // Higher probability of forest near the center, decreasing outward
                        const forestProb = Math.max(0, 1 - normalizedDist);
                        
                        // Add noise for more natural look
                        const noise = Math.random() * 0.2;
                        
                        if (Math.random() < forestProb - noise) {
                            mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.FOREST;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Check if a region already has a lot of specific terrain type
     * @param {Array} mapData - Map terrain data
     * @param {number} centerX - Center X of region to check
     * @param {number} centerY - Center Y of region to check
     * @param {number} radius - Radius to check around center
     * @param {number} terrainType - The terrain type to check for
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {boolean} true if the area already has many of the terrain type
     */
    checkTerrainDensity(mapData, centerX, centerY, radius, terrainType, width, height) {
        let terrainCount = 0;
        let totalTiles = 0;
        
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (y >= 0 && y < height && x >= 0 && x < width) {
                    totalTiles++;
                    if (mapData[y][x] === terrainType) {
                        terrainCount++;
                    }
                }
            }
        }
        
        // If the area already has more than 25% of the terrain type, consider it dense
        return terrainCount / totalTiles > 0.25;
    }
    
    /**
     * Check if a region already has a lot of bushes
     * @param {Array} mapData - Map terrain data
     * @param {number} centerX - Center X of region to check
     * @param {number} centerY - Center Y of region to check
     * @param {number} radius - Radius to check around center
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {boolean} true if the area already has many bushes
     */
    checkBushDensity(mapData, centerX, centerY, radius, width, height) {
        return this.checkTerrainDensity(mapData, centerX, centerY, radius, TERRAIN.BUSH, width, height);
    }
    
    /**
     * Generate bushes - some near forests and some clustered in different areas
     */
    generateBushes(mapData, width, height, stage) {
        // First pass: place bushes near forests
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Skip if this tile is not meadow
                if (mapData[y][x] !== TERRAIN.MEADOW) continue;
                
                // Check if there's a forest nearby
                let hasForestNeighbor = false;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
                            mapData[ny][nx] === TERRAIN.FOREST) {
                            hasForestNeighbor = true;
                            break;
                        }
                    }
                    if (hasForestNeighbor) break;
                }
                
                // Higher probability of bush if near forest
                if (hasForestNeighbor && Math.random() < 0.4) {
                    mapData[y][x] = TERRAIN.BUSH;
                }
            }
        }
        
        // Second pass: create bush clusters in different areas
        // Number of clusters increases with stage
        const bushClusterCount = 4 + stage;
        
        // Bush cluster size based on stage
        const minClusterSize = 4 + stage * 2;
        const maxClusterSize = 8 + stage * 3;
        
        // Track cluster centers to ensure spacing
        const clusterCenters = [];
        const minClusterDistance = Math.min(width, height) * 0.15; // Minimum distance between clusters
        
        let attempts = 0;
        let clustersCreated = 0;
        
        while (clustersCreated < bushClusterCount && attempts < bushClusterCount * 3) {
            attempts++;
            
            // Random cluster center, avoiding edges
            const centerX = Math.floor(width * 0.1) + Math.floor(Math.random() * (width * 0.8));
            const centerY = Math.floor(height * 0.1) + Math.floor(Math.random() * (height * 0.8));
            
            // Check if this is too close to another cluster
            let tooClose = false;
            for (const center of clusterCenters) {
                const distSquared = Math.pow(centerX - center.x, 2) + Math.pow(centerY - center.y, 2);
                if (distSquared < Math.pow(minClusterDistance, 2)) {
                    tooClose = true;
                    break;
                }
            }
            
            // Check if area already has many bushes
            if (!tooClose && this.checkBushDensity(mapData, centerX, centerY, maxClusterSize, width, height)) {
                tooClose = true;
            }
            
            if (tooClose) continue;
            
            // Add this cluster center to the list
            clusterCenters.push({ x: centerX, y: centerY });
            clustersCreated++;
            
            // Random cluster size
            const clusterSize = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize));
            
            // Generate the bush cluster using noise-based approach
            for (let y = centerY - clusterSize/2; y < centerY + clusterSize/2; y++) {
                for (let x = centerX - clusterSize/2; x < centerX + clusterSize/2; x++) {
                    if (y >= 0 && y < height && x >= 0 && x < width) {
                        // Only replace meadow tiles
                        if (mapData[Math.floor(y)][Math.floor(x)] !== TERRAIN.MEADOW) continue;
                        
                        // Calculate distance from cluster center
                        const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
                        const normalizedDist = distSquared / (clusterSize * clusterSize / 4);
                        
                        // Higher probability of bush near the center, decreasing outward
                        const bushProb = Math.max(0, 1 - normalizedDist * 1.2);
                        
                        // Add noise for more natural look
                        const noise = Math.random() * 0.3;
                        
                        if (Math.random() < bushProb - noise) {
                            mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.BUSH;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Generate swamps in the map
     */
    generateSwamps(mapData, width, height, stage) {
        // Swamp clusters based on stage
        const swampClusterCount = 2 + stage;
        
        // Swamp cluster size based on stage
        const minClusterSize = 7 + stage * 2;
        const maxClusterSize = 12 + stage * 3;
        
        // Track cluster centers to ensure spacing
        const clusterCenters = [];
        const minClusterDistance = Math.min(width, height) * 0.2; // Minimum distance between clusters
        
        let attempts = 0;
        let clustersCreated = 0;
        
        while (clustersCreated < swampClusterCount && attempts < swampClusterCount * 3) {
            attempts++;
            
            // Random cluster center, avoiding edges
            const centerX = Math.floor(width * 0.1) + Math.floor(Math.random() * (width * 0.8));
            const centerY = Math.floor(height * 0.1) + Math.floor(Math.random() * (height * 0.8));
            
            // Check if this is too close to another cluster
            let tooClose = false;
            for (const center of clusterCenters) {
                const distSquared = Math.pow(centerX - center.x, 2) + Math.pow(centerY - center.y, 2);
                if (distSquared < Math.pow(minClusterDistance, 2)) {
                    tooClose = true;
                    break;
                }
            }
            
            // Check if area already has many swamps
            if (!tooClose && this.checkTerrainDensity(mapData, centerX, centerY, maxClusterSize, TERRAIN.SWAMP, width, height)) {
                tooClose = true;
            }
            
            if (tooClose) continue;
            
            // Add this cluster center to the list
            clusterCenters.push({ x: centerX, y: centerY });
            clustersCreated++;
            
            // Random cluster size
            const clusterSize = minClusterSize + Math.floor(Math.random() * (maxClusterSize - minClusterSize));
            
            // Generate the swamp cluster
            for (let y = centerY - clusterSize/2; y < centerY + clusterSize/2; y++) {
                for (let x = centerX - clusterSize/2; x < centerX + clusterSize/2; x++) {
                    if (y >= 0 && y < height && x >= 0 && x < width) {
                        // Only replace meadow tiles
                        if (mapData[Math.floor(y)][Math.floor(x)] !== TERRAIN.MEADOW) continue;
                        
                        // Calculate distance from center
                        const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
                        const normalizedDist = distSquared / (clusterSize * clusterSize / 4);
                        
                        // Higher probability near the center, decreasing outward
                        const swampProb = Math.max(0, 1 - normalizedDist * 1.1);
                        
                        // Add noise for more natural edges and make more contiguous
                        const noise = Math.random() * 0.25; // Less noise for more solid swamp patches
                        
                        if (Math.random() < swampProb - noise) {
                            mapData[Math.floor(y)][Math.floor(x)] = TERRAIN.SWAMP;
                        }
                    }
                }
            }
            
            // Add connecting streams between swamps if there's more than one
            if (clustersCreated > 1 && clustersCreated < swampClusterCount && Math.random() < 0.6) {
                const prevCenter = clusterCenters[clustersCreated - 2];
                this.createSwampStream(mapData, prevCenter.x, prevCenter.y, centerX, centerY, width, height);
            }
        }
    }
    
    /**
     * Create a swamp stream connecting two points
     */
    createSwampStream(mapData, x1, y1, x2, y2, width, height) {
        // Create a winding path between two points
        const points = [];
        const steps = Math.floor(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 5);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Add some noise to make the stream winding
            const noise = (Math.random() - 0.5) * 8;
            const px = Math.floor(x1 + (x2 - x1) * t + noise);
            const py = Math.floor(y1 + (y2 - y1) * t + noise);
            points.push({x: px, y: py});
        }
        
        // Draw swamp along the path
        for (const point of points) {
            const streamWidth = 2 + Math.floor(Math.random() * 3);
            for (let dy = -streamWidth; dy <= streamWidth; dy++) {
                for (let dx = -streamWidth; dx <= streamWidth; dx++) {
                    const nx = point.x + dx;
                    const ny = point.y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        // Only replace meadow with 70% chance to make it look natural
                        if (mapData[ny][nx] === TERRAIN.MEADOW && Math.random() < 0.7) {
                            mapData[ny][nx] = TERRAIN.SWAMP;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Create tilemap from the terrain data
     */
    createTilemap() {
        // Create the tilemap from our terrain data
        const map = this.scene.make.tilemap({
            data: this.terrainData, 
            tileWidth: TILE_SIZE, 
            tileHeight: TILE_SIZE
        });
        
        // Create terrain textures if they don't exist
        this.createTerrainTextures();
        
        // Add the tileset to the map
        const tileset = map.addTilesetImage('terrain_tiles');
        
        // Create terrain layer
        this.terrainLayer = map.createLayer(0, tileset, 0, 0);
        this.terrainLayer.setDepth(-1); // Draw behind everything else
        
        // Set collision properties for terrain types that need it
        this.terrainLayer.setCollisionByProperty({ index: TERRAIN.SWAMP });
        
        // Set custom properties for all tiles
        this.terrainLayer.forEachTile(tile => {
            // Add properties based on tile index
            const terrainEffect = this.effects[tile.index];
            if (terrainEffect) {
                tile.properties = {
                    name: terrainEffect.name,
                    slowFactor: terrainEffect.slowFactor,
                    damage: terrainEffect.damage
                };
                
                // For debugging
                if (terrainEffect.slowFactor < 1.0) {
                    console.log(`Set up ${terrainEffect.name} tile with slowFactor ${terrainEffect.slowFactor}`);
                }
            }
        });
        
        // Add collision for swamps
        if (this.scene.player) {
            this.scene.physics.add.collider(
                this.scene.player,
                this.terrainLayer,
                this.handleTerrainCollision,
                null,
                this
            );
        }
        
        this.terrainMap = map;
    }
    
    /**
     * Create the terrain textures if they don't exist yet
     */
    createTerrainTextures() {
        const scene = this.scene;
        
        // Skip if textures already exist
        if (scene.textures.exists('meadow_tile') && 
            scene.textures.exists('bush_tile') && 
            scene.textures.exists('forest_tile') &&
            scene.textures.exists('swamp_tile') &&
            scene.textures.exists('floor_tile')) {
            return;
        }
        
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
        tilesetCanvas.width = TILE_SIZE * 5; // 5 tile types including floor
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
    
    /**
     * Handle collision with terrain
     * @param {Phaser.GameObjects.GameObject} player - The player object
     * @param {Phaser.Tilemaps.Tile} tile - The tile that was collided with
     */
    handleTerrainCollision(player, tile) {
        if (tile.index === TERRAIN.SWAMP) {
            // Apply damage to player when in swamp water
            const damage = this.effects[TERRAIN.SWAMP].damage;
            if (damage > 0 && player.damage) {
                player.damage(damage);
                
                // Visual feedback for damage
                this.scene.tweens.add({
                    targets: player,
                    alpha: 0.5,
                    duration: 100,
                    yoyo: true
                });
            }
        }
    }
    
    /**
     * Check terrain at a specific world position and return terrain effect
     * @param {number} x - World x position
     * @param {number} y - World y position
     * @returns {object|null} Terrain effect at position or null
     */
    getTerrainAt(x, y) {
        if (!this.terrainLayer) return null;
        
        const tile = this.terrainLayer.getTileAtWorldXY(x, y);
        if (!tile) return null;
        
        return this.effects[tile.index] || null;
    }
    
    /**
     * Apply terrain effects to the specified entity
     * @param {object} entity - Entity to apply effects to (player, follower, enemy)
     */
    applyTerrainEffects(entity) {
        if (!entity || !entity.active) return;
        
        const terrainEffect = this.getTerrainAt(entity.x, entity.y);
        if (!terrainEffect) return;
        
        // Store original speed if not already stored
        if (entity.originalSpeed === undefined) {
            entity.originalSpeed = entity.speed;
            console.log(`Original speed set: ${entity.originalSpeed} for entity type: ${entity.constructor.name}`);
        }
            
        // Apply slowdown effect - but only if we have a valid slowFactor
        if (terrainEffect.slowFactor < 1.0) {
            // Apply slowdown using the original stored speed to prevent compounding slowdowns
            const newSpeed = entity.originalSpeed * terrainEffect.slowFactor;
            
            // Log the speed change for debugging
            if (entity.constructor.name === 'Player') {
                console.log(`Terrain: ${terrainEffect.name}, SlowFactor: ${terrainEffect.slowFactor}`);
                console.log(`Speed changed: ${entity.speed} → ${newSpeed}`);
            }
            
            entity.speed = newSpeed;
        } else {
            // Reset speed if not on slowing terrain and original speed exists
            if (entity.originalSpeed !== undefined) {
                entity.speed = entity.originalSpeed;
            }
        }
        
        // Apply damage from terrain (like swamp) - only to player
        if (terrainEffect.damage > 0 && entity.constructor.name === 'Player' && entity.damage) {
            // Use a damage timer to avoid applying damage every frame
            const currentTime = Date.now();
            if (!entity.lastTerrainDamageTime || currentTime - entity.lastTerrainDamageTime > 1000) {
                entity.damage(terrainEffect.damage);
                entity.lastTerrainDamageTime = currentTime;
                
                // Show visual effect for swamp damage
                this.scene.tweens.add({
                    targets: entity,
                    alpha: 0.6,
                    duration: 100,
                    yoyo: true
                });
                
                console.log(`Applied ${terrainEffect.damage} damage from ${terrainEffect.name} terrain`);
            }
        }
        
        // For debugging: track terrain changes for player entity
        if (entity.constructor.name === 'Player' && entity.lastTerrainName !== terrainEffect.name) {
            entity.lastTerrainName = terrainEffect.name;
            console.log(`Player entered: ${terrainEffect.name} terrain (slowFactor: ${terrainEffect.slowFactor})`);
        }
    }
    
    /**
     * Update terrain effects on all entities
     */
    update() {
        // Apply terrain effects to player and followers
        if (this.scene.player) {
            this.applyTerrainEffects(this.scene.player);
        }
        
        // Apply to followers
        if (this.scene.followers) {
            this.scene.followers.forEach(follower => {
                this.applyTerrainEffects(follower);
            });
        }
        
        // Apply to enemies
        if (this.scene.enemies) {
            this.scene.enemies.getChildren().forEach(enemy => {
                this.applyTerrainEffects(enemy);
            });
        }
    }
    
    /**
     * Create a natural meadow path connecting two points
     */
    createMeadowPath(mapData, x1, y1, x2, y2, width, height) {
        // Create a winding path between two meadow clusters
        const points = [];
        const steps = Math.floor(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 4);
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            // Add some noise to make the path winding
            const noise = (Math.random() - 0.5) * 10;
            const px = Math.floor(x1 + (x2 - x1) * t + noise);
            const py = Math.floor(y1 + (y2 - y1) * t + noise);
            points.push({x: px, y: py});
        }
        
        // Draw meadow along the path
        for (const point of points) {
            const pathWidth = 3 + Math.floor(Math.random() * 4);
            for (let dy = -pathWidth; dy <= pathWidth; dy++) {
                for (let dx = -pathWidth; dx <= pathWidth; dx++) {
                    const nx = point.x + dx;
                    const ny = point.y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        // Decrease probability with distance from path center
                        const prob = 0.9 - (dist / pathWidth);
                        if (Math.random() < prob) {
                            mapData[ny][nx] = TERRAIN.MEADOW;
                        }
                    }
                }
            }
        }
    }
} 