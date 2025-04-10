import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

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
        
        // Initialize UI
        this.createUI();
    }
    
    /**
     * Create all UI elements
     */
    createUI() {
        const style = { fontSize: '18px', fontFamily: 'Arial', fill: '#fff' };
        const depth = 10;
        
        // Score Text
        this.scoreText = this.scene.add.text(16, 50, 'Score: 0', style)
            .setDepth(depth)
            .setScrollFactor(0); // Fixed to camera
        
        // Hero Text
        this.heroText = this.scene.add.text(
            16, 
            78, 
            `Hero: ${this.scene.player.heroClass.name}`, 
            style
        ).setDepth(depth).setScrollFactor(0);
        
        // Special Cooldown Bar & Text
        const cdX = GAME_WIDTH - 110;
        const cdY = 30;
        
        // Background
        this.scene.add.rectangle(
            cdX + 50, 
            cdY + 6, 
            100, 
            12, 
            0x550000
        ).setDepth(depth).setScrollFactor(0);
        
        // Fill bar
        this.specialCooldownBar = this.scene.add.rectangle(
            cdX, 
            cdY, 
            0, 
            12, 
            0xff0000
        ).setOrigin(0, 0)
         .setDepth(depth + 1)
         .setScrollFactor(0);
        
        // Cooldown text
        this.cooldownText = this.scene.add.text(
            cdX + 50, 
            cdY + 25, 
            'READY', 
            { fontSize: '16px', fontFamily: 'Arial', fill: '#fff' }
        ).setOrigin(0.5)
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