import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { createGameTextures } from '../utils/textureGenerator.js';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
        console.log('TitleScene constructor called');
    }
    
    preload() {
        console.log('TitleScene preload started');
        createGameTextures(this); // Generate textures
        console.log('TitleScene assets created');
    }
    
    create() {
        console.log('TitleScene create started');
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 4, 'SNAKE SURVIVORS', {
            fontSize: '48px', fontFamily: 'Arial', fill: '#FFFFFF', 
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);
        
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'Choose Your Character:', {
            fontSize: '24px', fontFamily: 'Arial', fill: '#FFFFFF',
             stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        
        // Define characters directly here or import from heroClasses.js
        // Note: Colors here differ from heroClasses.js - need to standardize!
        const characters = [
            { name: 'Warrior', key: 'warrior', color: 0xFF0000, desc: 'Sword sweep: damages nearby enemies' }, 
            { name: 'Archer', key: 'archer', color: 0x00FF00, desc: 'Multi-shot: fires arrows in all directions' },
            { name: 'Mage', key: 'mage', color: 0x00FFFF, desc: 'Frost Nova: freezes nearby enemies' } 
        ];
        
        characters.forEach((char, index) => {
            const x = GAME_WIDTH / 2;
            const y = GAME_HEIGHT / 2 + index * 80;
            
            const buttonBg = this.add.rectangle(x, y, 300, 60, 0x333333, 0.8).setOrigin(0.5);
            const icon = this.add.rectangle(x - 120, y, 40, 40, char.color).setOrigin(0.5);
            const nameText = this.add.text(x - 80, y - 15, char.name, { fontSize: '24px', fontFamily: 'Arial', fill: '#FFFFFF' }).setOrigin(0, 0.5);
            const descText = this.add.text(x - 80, y + 15, char.desc, { fontSize: '14px', fontFamily: 'Arial', fill: '#CCCCCC' }).setOrigin(0, 0.5);
            
            buttonBg.setInteractive({ useHandCursor: true })
                .on('pointerover', () => buttonBg.setFillStyle(0x555555, 0.8))
                .on('pointerout', () => buttonBg.setFillStyle(0x333333, 0.8))
                .on('pointerdown', () => {
                    console.log('Character selected:', char.name);
                    // Pass the selected hero key to the next scene
                    this.scene.start('GameScene', { selectedHeroKey: char.key }); 
                });
        });
        console.log('TitleScene create completed');
    }
} 