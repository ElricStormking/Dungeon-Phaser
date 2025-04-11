export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const PIXEL_SIZE = 4; // Base pixel size for art
export const TILE_SIZE = 48; // Size of each tile in the game grid (increased from 32)

// Define larger world dimensions (e.g., 2x game size => 4x area)
export const WORLD_WIDTH = GAME_WIDTH * 2;
export const WORLD_HEIGHT = GAME_HEIGHT * 2;

// Define tile indices
export const MEADOW_TILE = 0;
export const BUSH_TILE = 1;
export const FOREST_TILE = 2;
export const SWAMP_TILE = 3;
export const FLOOR_TILE = 4;

// Game settings
export const FILE_SIZE = 16; // Size of follower entity

// Terrain movement modifiers
export const FOREST_SPEED_MODIFIER = 0.5; // 50% speed in forests
export const BUSH_SPEED_MODIFIER = 0.75; // 75% speed in bushes
export const SWAMP_DAMAGE = 1; // Damage per second in swamps

// Enemy wave settings
export const WAVE_COUNT = 5; // 5 waves per level
export const BOSS_LEVEL_INTERVAL = 8; // Boss appears every 8 levels

// Game mechanics constants
export const MAX_FOLLOWERS = 10; // Maximum number of followers the player can have
export const BASE_PLAYER_SPEED = 100; // Base movement speed
export const BASE_ENEMY_SPEED = 80; // Base enemy movement speed

// Audio settings
export const MUSIC_VOLUME = 0.5;
export const SFX_VOLUME = 0.7;

// UI constants
export const UI_PADDING = 10;
export const UI_FONT_FAMILY = 'Arial';
export const UI_PRIMARY_COLOR = '#FFFFFF';
export const UI_SECONDARY_COLOR = '#FFFF00';