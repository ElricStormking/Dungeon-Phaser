// Main entry point for Snake Survivors
// Sets up the Phaser game instance and registers scenes

import TitleScene from '/src/scenes/TitleScene.js';
import GameScene from '/src/scenes/GameScene.js';
import { TILE_SIZE } from '/src/constants.js';

// Log when modules are loaded for debugging
console.log('main.js loaded');
console.log('TitleScene imported:', !!TitleScene);
console.log('GameScene imported:', !!GameScene);

// Phaser configuration for Snake Survivors
const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        // Start with the title scene
        TitleScene,
        GameScene
    ],
    pixelArt: true, // Enable pixel art mode (no smoothing)
    roundPixels: true, // Prevent pixel bleeding
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080
    },
    // Set paths for loading assets
    loader: {
        baseURL: '/',
        path: ''
    }
};

// Create game instance when the document is loaded
window.addEventListener('load', () => {
    try {
        console.log('Creating game instance...');
        
        // Create game
        const game = new Phaser.Game(config);
        
        // Add game to window for debugging
        window.game = game;
        
        // Log game creation
        console.log('Snake Survivors ECS Edition started!');
        console.log('Game version: 1.0.0');
        console.log('Phaser version:', Phaser.VERSION);
        
        // Hide loading message if exists
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
    } catch (error) {
        console.error('Error creating game:', error);
        showErrorMessage(error.message || 'Failed to create game');
    }
});

// Handle errors globally
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Error occurred:", message, "at", source, "line", lineno);
    showErrorMessage(message, source, lineno);
    return true; // Prevents the default browser error message
};

// Show error message in the UI
function showErrorMessage(message, source, lineno) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        let errorHtml = `<strong>Error:</strong> ${message}<br>`;
        
        if (source && lineno) {
            errorHtml += `<small>at ${source} line ${lineno}</small><br>`;
        }
        
        errorHtml += `<br><button onclick="location.reload()">Reload Page</button>`;
        errorElement.innerHTML = errorHtml;
        errorElement.style.display = 'block';
        
        // Hide loading message if still visible
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
    }
}

// Export the game config
export { config }; 