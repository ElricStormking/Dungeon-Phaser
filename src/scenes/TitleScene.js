import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { createGameTextures } from '../utils/textureGenerator.js';
import AudioManager from '../audio/AudioManager.js';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
        console.log('TitleScene constructor called');
        this.audioManager = null;
        this.audioInitialized = false;
    }
    
    preload() {
        console.log('TitleScene preload started');
        createGameTextures(this); // Generate textures
        
        // Initialize audio manager but don't play anything yet
        try {
            this.audioManager = new AudioManager(this);
            this.audioManager.init();
        } catch (error) {
            console.warn('Failed to initialize audio system:', error);
        }
        
        console.log('TitleScene assets created');
    }
    
    create() {
        console.log('TitleScene create started');
        
        // Create the main title
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 4, 'SNAKE SURVIVORS', {
            fontSize: '48px', fontFamily: 'Arial', fill: '#FFFFFF', 
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);
        
        // Add a "Click to Play" button to ensure user interaction first
        const playButton = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 200, 50, 0x333333, 0.8).setOrigin(0.5);
        const playText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'CLICK TO PLAY', {
            fontSize: '24px', fontFamily: 'Arial', fill: '#FFFFFF',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        
        // Make button interactive
        playButton.setInteractive({ useHandCursor: true })
            .on('pointerover', () => playButton.setFillStyle(0x555555, 0.8))
            .on('pointerout', () => playButton.setFillStyle(0x333333, 0.8))
            .on('pointerdown', () => {
                // After user interaction, now we can play audio
                if (this.audioManager && !this.audioInitialized) {
                    try {
                        console.log('User interaction detected, starting title music (non-looping)');
                        this.audioManager.playMusic('title_music', false);
                        this.audioInitialized = true;
                    } catch (error) {
                        console.warn('Failed to play title music:', error);
                    }
                }
                
                // Hide the play button and show character selection
                playButton.setVisible(false);
                playText.setVisible(false);
                this.showCharacterSelection();
            });
            
        console.log('TitleScene create completed');
    }
    
    showCharacterSelection() {
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
                    
                    // Play a selection sound
                    if (this.audioManager) {
                        try {
                            this.audioManager.playSFX('pickup');
                        } catch (error) {
                            console.warn('Failed to play pickup sound:', error);
                        }
                    }
                    
                    // Stop title music with immediate stop (no fade)
                    if (this.audioManager) {
                        try {
                            console.log('Stopping title music');
                            this.audioManager.stopMusic(0); // Immediate stop with no fade
                        } catch (error) {
                            console.warn('Failed to stop title music:', error);
                        }
                    }
                    
                    // Pass the selected hero key to the next scene
                    this.scene.start('GameScene', { selectedHeroKey: char.key }); 
                });
        });
    }
} 