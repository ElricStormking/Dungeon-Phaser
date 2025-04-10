export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const PIXEL_SIZE = 4; // Base pixel size for art
export const TILE_SIZE = 16; // Size of each tile in the game grid

// Define larger world dimensions (e.g., 2x game size => 4x area)
export const WORLD_WIDTH = GAME_WIDTH * 2;
export const WORLD_HEIGHT = GAME_HEIGHT * 2;

// Define tile indices
export const MEADOW_TILE = 0;
export const BUSH_TILE = 1;
export const FOREST_TILE = 2;

// Game settings
export const FILE_SIZE = 16; // Size of follower entity

// Assume textures 'meadow_tile', 'bush_tile', 'forest_tile' exist and are TILE_SIZE x TILE_SIZE
// These would ideally be loaded in preload() or generated via createGameTextures

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        // ... existing properties ...
        this.terrainLayer = null; // Add property for the terrain layer
        this.forestTileIndex = FOREST_TILE; // Store forest index
        // ...
    }

    // ... preload ...

    create() {
        console.log('GameScene create started');

        // --- Set World Bounds ---
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // --- Create Tilemap ---
        const mapWidthInTiles = WORLD_WIDTH / TILE_SIZE;
        const mapHeightInTiles = WORLD_HEIGHT / TILE_SIZE;
        const mapData = [];

        // Generate simple random map data
        for (let y = 0; y < mapHeightInTiles; y++) {
            const row = [];
            for (let x = 0; x < mapWidthInTiles; x++) {
                const rand = Math.random();
                if (rand < 0.15) { // 15% chance of forest
                    row.push(FOREST_TILE);
                } else if (rand < 0.25) { // 10% chance of bush
                    row.push(BUSH_TILE);
                } else { // 75% chance of meadow
                    row.push(MEADOW_TILE);
                }
            }
            mapData.push(row);
        }

        const map = this.make.tilemap({ data: mapData, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
        // Link tileset names used in map creation ('terrain_tiles') to the actual texture keys loaded/generated
        // Assuming a single spritesheet or individual images named appropriately
        const tileset = map.addTilesetImage('terrain_tiles', null, TILE_SIZE, TILE_SIZE, 0, 0, {
            [MEADOW_TILE]: 'meadow_tile', // Map index 0 to 'meadow_tile' texture key
            [BUSH_TILE]: 'bush_tile',     // Map index 1 to 'bush_tile' texture key
            [FOREST_TILE]: 'forest_tile'  // Map index 2 to 'forest_tile' texture key
        });

        if (!tileset) {
             console.error("Failed to load tileset! Ensure textures 'meadow_tile', 'bush_tile', 'forest_tile' are loaded and the tileset name 'terrain_tiles' matches.");
        } else {
            console.log("Tileset loaded:", tileset.name);
             // Add custom property to forest tiles directly in the tileset data
            tileset.tileProperties = tileset.tileProperties || {}; // Ensure tileProperties exists
            tileset.tileProperties[FOREST_TILE] = { slows: true, name: 'Forest' }; // Add property to index 2
             console.log("Forest tile properties:", tileset.tileProperties[FOREST_TILE]);

            this.terrainLayer = map.createLayer(0, tileset, 0, 0); // Layer index 0, use the created tileset
            if (!this.terrainLayer) {
                console.error("Failed to create terrain layer!");
            } else {
                console.log("Terrain layer created successfully.");
                 this.terrainLayer.setDepth(-1); // Draw terrain behind everything else
            }
        }
         // --- End Tilemap Creation ---


        // Set Hero Class
        this.currentHeroClass = heroClasses[this.selectedHeroKey];
        // ... rest of create method ...
    }
    // ... rest of GameScene ...

    updateEnemies(delta) {
        this.enemies.children.each(enemy => {
            if (!enemy.active || enemy.isFrozen) return;

             // --- Enemy Slowdown Check ---
             let currentSpeed = enemy.speed; // Use the potentially modified speed
             if (this.terrainLayer) {
                 const enemyTile = this.terrainLayer.getTileAtWorldXY(enemy.x, enemy.y);
                 if (enemyTile && enemyTile.properties.slows) {
                      // If on a slow tile
                      if (enemy.originalSpeed === undefined) { // Store original speed only once
                          enemy.originalSpeed = enemy.speed;
                      }
                      // Apply slowdown factor (e.g., 50%)
                      currentSpeed = enemy.originalSpeed * 0.4; // Significantly slower in forest
                 } else {
                      // If not on a slow tile, restore original speed if it was modified
                      if (enemy.originalSpeed !== undefined) {
                          currentSpeed = enemy.originalSpeed;
                          delete enemy.originalSpeed; // Remove the stored speed
                      }
                 }
             }
             // Update the enemy's speed property for internal use if needed,
             // but use currentSpeed for the movement calculation this frame.
             enemy.speed = currentSpeed;
             // --- End Enemy Slowdown Check ---


            // Only move if reasonably close to player or camera view? (Optimization)
            // const cam = this.cameras.main;
            // if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) < cam.width * 1.5) {
                // Use the potentially modified currentSpeed for movement
                this.physics.moveToObject(enemy, this.player, currentSpeed);
                enemy.rotation = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            // }
        });
    }
}