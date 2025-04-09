// Main entry point for Snake Survivors
// Sets up the Phaser game instance and registers scenes

import TitleScene from './title-scene.js';
import GameScene from './game-scene.js';

// Log when modules are loaded for debugging
console.log('main.js loaded');
console.log('TitleScene imported:', !!TitleScene);
console.log('GameScene imported:', !!GameScene);

// Define TILE_SIZE here as well in case other modules need it
const TILE_SIZE = 16;

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#222222',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: [TitleScene, GameScene]
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

// Export the game config and TILE_SIZE constant
export { config, TILE_SIZE }; 