// Title Scene for Snake Survivors
// Provides character selection and game start

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }
    
    preload() {
        // Preload assets if needed
        // Most assets will be created at runtime in GameScene
    }
    
    create() {
        // Title text
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 4, 'SNAKE SURVIVORS', {
            fontSize: '48px',
            fontFamily: 'Arial',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // Character selection text
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'Choose Your Character:', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Create character selection buttons
        const characters = [
            { name: 'Warrior', color: 0x00FFFF, desc: 'Sword sweep: damages nearby enemies' },
            { name: 'Archer', color: 0x00FF00, desc: 'Multi-shot: fires arrows in all directions' },
            { name: 'Mage', color: 0x00FFFF, desc: 'Frost Nova: freezes nearby enemies' }
        ];
        
        characters.forEach((char, index) => {
            // Calculate position
            const x = GAME_WIDTH / 2;
            const y = GAME_HEIGHT / 2 + index * 80;
            
            // Create button background
            const buttonBg = this.add.rectangle(x, y, 300, 60, 0x333333, 0.8)
                .setOrigin(0.5);
            
            // Create character icon
            const icon = this.add.rectangle(x - 120, y, 40, 40, char.color)
                .setOrigin(0.5);
            
            // Create character name
            const nameText = this.add.text(x - 80, y - 15, char.name, {
                fontSize: '24px',
                fontFamily: 'Arial',
                fill: '#FFFFFF'
            }).setOrigin(0, 0.5);
            
            // Create character description
            const descText = this.add.text(x - 80, y + 15, char.desc, {
                fontSize: '14px',
                fontFamily: 'Arial',
                fill: '#CCCCCC'
            }).setOrigin(0, 0.5);
            
            // Make button interactive
            buttonBg.setInteractive({ useHandCursor: true })
                .on('pointerover', () => buttonBg.setFillStyle(0x555555, 0.8))
                .on('pointerout', () => buttonBg.setFillStyle(0x333333, 0.8))
                .on('pointerdown', () => {
                    // Set selected character and start game
                    const selectedHero = char.name.toLowerCase();
                    this.scene.start('GameScene', { selectedHero });
                });
        });
        
        // Help text
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'Controls: Arrow Keys/WASD to move, SPACE for special attack', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);
        
        // Add version info
        this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, 'v1.0.0 ECS Edition', {
            fontSize: '12px',
            fontFamily: 'Arial',
            fill: '#666666'
        }).setOrigin(1, 1);
    }
}

export default TitleScene; 