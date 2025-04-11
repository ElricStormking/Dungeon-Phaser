import { GAME_WIDTH, GAME_HEIGHT, UI_PADDING } from '../constants.js';

/**
 * Manages all UI elements in the game
 */
export default class UIManager {
    constructor(scene) {
        this.scene = scene;
        
        // UI elements
        this.scoreText = null;
        this.heroText = null;
        this.specialCooldownBar = null;
        this.cooldownText = null;
        this.uiBackground = null;
        
        // Initialize UI
        this.createUI();
    }
    
    /**
     * Create all UI elements
     */
    createUI() {
        const style = { 
            fontSize: '24px', 
            fontFamily: 'Arial', 
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        };
        const depth = 100;
        
        // Create semi-transparent UI panel background at the top
        this.uiBackground = this.scene.add.rectangle(
            GAME_WIDTH / 2,
            40,
            GAME_WIDTH,
            80,
            0x000000,
            0.7
        )
            .setScrollFactor(0)
            .setDepth(depth - 1);
            
        // Add a border to the UI background
        this.scene.add.rectangle(
            GAME_WIDTH / 2,
            40,
            GAME_WIDTH,
            80,
            0x333333,
            1
        )
            .setScrollFactor(0)
            .setDepth(depth - 1)
            .setStrokeStyle(2, 0x666666);
        
        // Score Text - positioned at top-right
        this.scoreText = this.scene.add.text(
            GAME_WIDTH - UI_PADDING - 20, 
            UI_PADDING + 10, 
            'Score: 0', 
            style
        )
            .setDepth(depth)
            .setScrollFactor(0) // Fixed to camera
            .setOrigin(1, 0); // Right-aligned
        
        // Hero Text - positioned at top-left
        this.heroText = this.scene.add.text(
            UI_PADDING + 20, 
            UI_PADDING + 10, 
            `${this.scene.player.heroClass.name}`, 
            style
        )
            .setDepth(depth)
            .setScrollFactor(0)
            .setOrigin(0, 0); // Left-aligned
        
        // Special Cooldown Bar & Text
        const cdX = UI_PADDING + 20;
        const cdY = UI_PADDING + 50;
        
        // Background
        this.scene.add.rectangle(
            cdX + 50, 
            cdY, 
            100, 
            16, 
            0x550000
        ).setDepth(depth).setScrollFactor(0);
        
        // Fill bar
        this.specialCooldownBar = this.scene.add.rectangle(
            cdX, 
            cdY, 
            0, 
            16, 
            0xff0000
        ).setOrigin(0, 0.5)
         .setDepth(depth + 1)
         .setScrollFactor(0);
        
        // Cooldown text
        this.cooldownText = this.scene.add.text(
            cdX + 130, 
            cdY, 
            'READY', 
            { fontSize: '18px', fontFamily: 'Arial', fill: '#00ff00', stroke: '#000', strokeThickness: 2 }
        ).setOrigin(0, 0.5)
         .setDepth(depth + 1)
         .setScrollFactor(0);
        
        // Initialize cooldown display
        this.updateCooldownDisplay();
    }
    
    /**
     * Update the special attack cooldown display
     */
    updateCooldownDisplay() {
        if (!this.specialCooldownBar || !this.cooldownText || !this.scene.player) return;
        
        const cooldownRatio = this.scene.player.specialAttackCooldown / 
                             this.scene.player.specialAttackCooldownMax;
        
        const barWidth = 100 * Math.max(0, 1 - cooldownRatio);
        this.specialCooldownBar.width = barWidth;
        
        if (this.scene.player.specialAttackCooldown <= 0) {
            this.cooldownText.setText('READY').setFill('#00FF00');
        } else {
            const seconds = Math.ceil(this.scene.player.specialAttackCooldown / 1000);
            this.cooldownText.setText(seconds + 's').setFill('#AAAAAA');
        }
    }
    
    /**
     * Update the score display
     * @param {number} score - Current score
     */
    updateScore(score) {
        if (this.scoreText) {
            this.scoreText.setText('Score: ' + score);
        }
    }
    
    /**
     * Show the game over screen
     * @param {number} score - Final score
     * @param {number} level - Final level
     */
    showGameOverScreen() {
        const scene = this.scene;
        const score = scene.score;
        const level = scene.levelSystem.currentLevel;
        
        // Dim background
        scene.add.rectangle(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2, 
            GAME_WIDTH, 
            GAME_HEIGHT, 
            0x000000, 
            0.7
        ).setDepth(19).setScrollFactor(0);
        
        // Game Over text
        scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2 - 50, 
            'GAME OVER', 
            { 
                fontSize: '64px', 
                fontFamily: 'Arial', 
                color: '#FF0000', 
                stroke: '#FFFFFF', 
                strokeThickness: 4 
            }
        ).setOrigin(0.5).setDepth(20).setScrollFactor(0);
        
        // Score display
        scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2 + 20, 
            `Score: ${score}`, 
            { 
                fontSize: '32px', 
                fontFamily: 'Arial', 
                color: '#FFFFFF' 
            }
        ).setOrigin(0.5).setDepth(20).setScrollFactor(0);
        
        // Level display
        scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2 + 60, 
            `Level: ${level}`, 
            { 
                fontSize: '24px', 
                fontFamily: 'Arial', 
                color: '#FFFFFF' 
            }
        ).setOrigin(0.5).setDepth(20).setScrollFactor(0);
        
        // Restart button
        const restartButton = scene.add.rectangle(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2 + 120, 
            200, 
            50, 
            0x666666
        ).setInteractive({ useHandCursor: true }).setDepth(20).setScrollFactor(0);
        
        const restartText = scene.add.text(
            GAME_WIDTH / 2, 
            GAME_HEIGHT / 2 + 120, 
            'Restart', 
            { 
                fontSize: '24px', 
                fontFamily: 'Arial', 
                color: '#FFFFFF' 
            }
        ).setOrigin(0.5).setDepth(20).setScrollFactor(0);
        
        // Button interactions
        restartButton.on('pointerover', () => restartButton.fillColor = 0x888888);
        restartButton.on('pointerout', () => restartButton.fillColor = 0x666666);
        restartButton.on('pointerdown', () => {
            scene.scene.start('TitleScene'); // Go back to title
        });
    }
    
    /**
     * Update method called every frame
     */
    update() {
        // Update cooldown display
        this.updateCooldownDisplay();
    }
} 