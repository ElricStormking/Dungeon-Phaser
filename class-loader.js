import { TILE_SIZE } from './src/constants.js';

class ClassLoader {
    constructor(scene) {
        this.scene = scene;
        this.engineerClasses = {};
        this.commanderClasses = {};
        this.loaded = false;
        this.useTextAreas = false; // Flag to check if we're using text areas instead of file loading
    }

    preload() {
        // Check if text areas exist for offline loading
        if (document.getElementById('engineerClassesData') && 
            document.getElementById('commanderClassesData')) {
            this.useTextAreas = true;
            console.log('Using text areas for class data loading');
            return; // No need to preload files
        }
        
        // Standard file loading
        this.scene.load.text('classStats', 'class-stats.csv');
        this.scene.load.text('commanderStats', 'commander-stats.csv');
    }

    load() {
        if (this.loaded) {
            console.log("ClassLoader already loaded, skipping load()");
            return;
        }
        
        console.log("Starting ClassLoader.load()");
        
        let engineerCSV, commanderCSV;
        
        if (this.useTextAreas) {
            // Load from text areas
            console.log("Loading from text areas...");
            engineerCSV = document.getElementById('engineerClassesData')?.textContent;
            commanderCSV = document.getElementById('commanderClassesData')?.textContent;
        } else {
            // Load from game cache
            console.log("Loading from game cache...");
            try {
                engineerCSV = this.scene.cache.text.get('classStats');
                console.log("Engineer CSV loaded:", engineerCSV ? engineerCSV.substring(0, 100) + "..." : "Failed");
                console.log("Engineer CSV length:", engineerCSV ? engineerCSV.length : 0);
                
                commanderCSV = this.scene.cache.text.get('commanderStats');
                console.log("Commander CSV loaded:", commanderCSV ? commanderCSV.substring(0, 100) + "..." : "Failed");
                console.log("Commander CSV length:", commanderCSV ? commanderCSV.length : 0);
                
                // Check specifically for commander CSV issues
                if (!commanderCSV) {
                    console.error("Failed to load commander CSV from cache");
                    console.log("Available cache keys:", Object.keys(this.scene.cache.text.entries));
                } else if (commanderCSV.length === 0) {
                    console.error("Commander CSV is empty");
                }
            } catch (error) {
                console.error("Error loading CSV files from cache:", error);
            }
        }
        
        // Load engineer classes
        if (!engineerCSV) {
            console.error('Failed to load engineer class data');
            this.loadDefaultEngineerClasses();
        } else {
            this.parseCSV(engineerCSV, 'engineer');
            // If parsing failed or didn't find any valid classes, use defaults
            if (Object.keys(this.engineerClasses).length === 0) {
                console.error('Failed to parse any engineer classes from CSV, using defaults');
                this.loadDefaultEngineerClasses();
            }
        }
        
        // Load commander classes
        console.log("Processing commander CSV data...");
        if (!commanderCSV) {
            console.error('Failed to load commander class data, using defaults');
            this.loadDefaultCommanderClasses();
        } else {
            console.log(`Commander CSV data exists, length: ${commanderCSV.length}`);
            this.parseCSV(commanderCSV, 'commander');
            // If parsing failed or didn't find any valid classes, use defaults
            if (Object.keys(this.commanderClasses).length === 0) {
                console.error('Failed to parse any commander classes from CSV, using defaults');
                this.loadDefaultCommanderClasses();
            } else {
                console.log(`Successfully parsed ${Object.keys(this.commanderClasses).length} commander classes from CSV`);
                // Detailed dump of warrior class if present
                if (this.commanderClasses['warrior']) {
                    console.log("Warrior class details:", JSON.stringify(this.commanderClasses['warrior'], null, 2));
                }
            }
        }
        
        this.loaded = true; // Set to true regardless, since we'll have default data at minimum
        
        console.log('Loaded', Object.keys(this.engineerClasses).length, 'engineer classes and', 
                    Object.keys(this.commanderClasses).length, 'commander classes');
        console.log('Engineer class keys:', Object.keys(this.engineerClasses));
        console.log('Commander class keys:', Object.keys(this.commanderClasses));
    }

    parseCSV(csvContent, fileType) {
        console.log(`Starting to parse ${fileType} CSV with content length: ${csvContent.length}`);

        const lines = csvContent.split('\n');
        if (lines.length < 2) {
            console.error(`CSV file for ${fileType} has insufficient data, only ${lines.length} lines`);
            return;
        }

        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Log the headers for debugging
        console.log(`CSV headers for ${fileType}:`, headers);

        // Process each line
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) {
                console.log(`Skipping empty line ${i} in ${fileType} CSV`);
                continue;
            }
            
            const values = lines[i].split(',').map(v => v.trim());
            const classData = {};
            
            console.log(`Processing line ${i} in ${fileType} CSV: ${lines[i].substring(0, 50)}...`);
            console.log(`Values length: ${values.length}, Headers length: ${headers.length}`);
            
            // Map values to keys based on headers
            headers.forEach((header, index) => {
                if (index < values.length) {
                    let value = values[index];
                    let headerLower = header.toLowerCase();
                    
                    // Debug output each field
                    console.log(`  Field ${header}: '${value}'`);
                    
                    // Convert numeric values
                    if (['damage', 'range', 'speed', 'cooldown', 'health'].includes(headerLower)) {
                        const originalValue = value;
                        value = parseFloat(value) || 0;
                        console.log(`  Converting field ${header} from '${originalValue}' to number: ${value}`);
                    }
                    
                    // Convert color to hex number
                    if (headerLower === 'color' && value.startsWith('#')) {
                        const originalValue = value;
                        value = parseInt(value.replace('#', '0x'));
                        console.log(`  Converting color from '${originalValue}' to hex number: ${value.toString(16)}`);
                    }
                    
                    // Store value with both original case and lowercase
                    classData[headerLower] = value;
                    
                    // Also store it with its original case
                    classData[header] = value;
                    
                    // And store common variations for key fields
                    if (headerLower === 'attackstyle') {
                        classData.attack_style = value;
                        classData.attackStyle = value;
                    } else if (headerLower === 'specialability') {
                        classData.special_ability = value;
                        classData.specialAbility = value;
                    }
                }
            });

            // Add special attack function based on class type and special ability
            this.addSpecialAttackFunction(classData);
            
            // Store by type
            let type = null;
            if (classData.type) {
                type = classData.type.toLowerCase();
            } else if (classData.Type) {
                type = classData.Type.toLowerCase();
            }
            
            let name = classData.name || classData.Name;
            
            console.log(`Class data: Type=${type}, Name=${name}`);
            if (type && name) {
                const key = this.getClassKey(name);
                console.log(`  Converted to key: ${key}`);
                
                if (type === 'engineer') {
                    this.engineerClasses[key] = classData;
                    console.log(`  Added to engineerClasses with key '${key}'`);
                } else if (type === 'commander') {
                    this.commanderClasses[key] = classData;
                    console.log(`  Added to commanderClasses with key '${key}'`);
                    // Extra debug for range value
                    console.log(`  Commander ${key} range value: ${classData.range} (${typeof classData.range})`);
                }
            } else {
                console.warn(`  Missing type or name in line ${i}, cannot add to classes`);
            }
        }
        
        // Debug output for commanders
        console.log(`Loaded commander classes keys: ${Object.keys(this.commanderClasses).join(', ')}`);
        for (const [key, data] of Object.entries(this.commanderClasses)) {
            console.log(`Commander ${key}: range=${data.range}, damage=${data.damage}, color=${data.color}`);
        }
    }

    getClassKey(name) {
        // Remove numbers from the end of class names (e.g., "Chronotemporal1" -> "chronotemporal")
        return name.toLowerCase().replace(/\s+/g, '').replace(/\d+$/, '');
    }

    addSpecialAttackFunction(classData) {
        // Default empty function
        classData.specialAttack = () => false;
        
        // If it's not an engineer, leave default
        if (classData.type?.toLowerCase() !== 'engineer') {
            return;
        }
        
        // Debug logging for troubleshooting
        console.log(`Adding attack for ${classData.name}:`, classData);
        
        // Handle different variations of the attack style field
        let attackStyle = null;
        
        // Try different possible field names for attack style
        if (classData.attackstyle) {
            attackStyle = classData.attackstyle.toLowerCase();
        } else if (classData.attack_style) {
            attackStyle = classData.attack_style.toLowerCase();
        } else if (classData.attackStyle) {
            attackStyle = classData.attackStyle.toLowerCase();
        }
        
        // If no attack style found, default to 'chain'
        if (!attackStyle) {
            console.warn(`No attack style found for ${classData.name}, defaulting to chain`);
            attackStyle = 'chain';
        }
        
        console.log(`${classData.name} using attack style: ${attackStyle}`);
        
        const specialAbility = classData.special_ability || classData.specialability;
        
        // Create appropriate special attack function based on attack style
        switch (attackStyle.toLowerCase()) {
            case 'melee':
                classData.specialAttack = (scene, follower, enemies) => {
                    // Melee attack with short range but high damage
                    const range = TILE_SIZE * (classData.range || 2);
                    let hit = false;
                    
                    const followerPos = follower.getComponent('PositionComponent');
                    if (!followerPos) return false;
                    
                    enemies.forEach(enemy => {
                        const enemyPos = enemy.getComponent('PositionComponent');
                        if (!enemyPos) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            followerPos.x, followerPos.y, 
                            enemyPos.x, enemyPos.y
                        );
                        
                        if (distance <= range) {
                            // Apply damage
                            const healthComp = enemy.getComponent('HealthComponent');
                            if (healthComp) {
                                healthComp.health -= classData.damage || 3;
                                hit = true;
                                
                                // Visual effect
                                scene.add.circle(enemyPos.x, enemyPos.y, TILE_SIZE/2, classData.color, 0.7)
                                    .setDepth(5000)
                                    .setAlpha(0.7);
                                scene.tweens.add({
                                    targets: scene.children.getChildren().pop(),
                                    alpha: 0,
                                    scale: 2,
                                    duration: 300,
                                    onComplete: function(tween, targets) {
                                        targets[0].destroy();
                                    }
                                });
                            }
                        }
                    });
                    
                    return hit;
                };
                break;
                
            case 'ranged':
                classData.specialAttack = (scene, follower, enemies) => {
                    // Ranged attack with longer range
                    const range = TILE_SIZE * (classData.range || 6);
                    let hit = false;
                    
                    const followerPos = follower.getComponent('PositionComponent');
                    if (!followerPos) return false;
                    
                    // Find closest enemy in range
                    let target = null;
                    let closestDistance = range;
                    
                    enemies.forEach(enemy => {
                        const enemyPos = enemy.getComponent('PositionComponent');
                        if (!enemyPos) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            followerPos.x, followerPos.y, 
                            enemyPos.x, enemyPos.y
                        );
                        
                        if (distance <= closestDistance) {
                            closestDistance = distance;
                            target = enemy;
                        }
                    });
                    
                    if (target) {
                        const targetPos = target.getComponent('PositionComponent');
                        if (!targetPos) return false;
                        
                        // Create projectile
                        const projectile = scene.add.circle(
                            followerPos.x, followerPos.y, 
                            4, classData.color, 1
                        );
                        
                        // Animate projectile
                        scene.tweens.add({
                            targets: projectile,
                            x: targetPos.x,
                            y: targetPos.y,
                            duration: 300,
                            onComplete: () => {
                                // Apply damage
                                const healthComp = target.getComponent('HealthComponent');
                                if (healthComp) {
                                    healthComp.health -= classData.damage || 2;
                                }
                                
                                // Visual effect
                                scene.add.circle(targetPos.x, targetPos.y, TILE_SIZE/2, classData.color, 0.7)
                                    .setDepth(5000);
                                scene.tweens.add({
                                    targets: scene.children.getChildren().pop(),
                                    alpha: 0,
                                    scale: 2,
                                    duration: 200,
                                    onComplete: function(tween, targets) {
                                        targets[0].destroy();
                                    }
                                });
                                
                                projectile.destroy();
                            }
                        });
                        
                        hit = true;
                    }
                    
                    return hit;
                };
                break;
                
            case 'magic':
                classData.specialAttack = (scene, follower, enemies) => {
                    // Magic attack with area effect
                    const range = TILE_SIZE * (classData.range || 5);
                    let hit = false;
                    
                    const followerPos = follower.getComponent('PositionComponent');
                    if (!followerPos) return false;
                    
                    // Create magic effect
                    const effect = scene.add.circle(
                        followerPos.x, followerPos.y, 
                        range, classData.color, 0.3
                    ).setDepth(4000);
                    
                    scene.tweens.add({
                        targets: effect,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            effect.destroy();
                        }
                    });
                    
                    // Apply damage to enemies in range
                    enemies.forEach(enemy => {
                        const enemyPos = enemy.getComponent('PositionComponent');
                        if (!enemyPos) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            followerPos.x, followerPos.y, 
                            enemyPos.x, enemyPos.y
                        );
                        
                        if (distance <= range) {
                            // Apply damage
                            const healthComp = enemy.getComponent('HealthComponent');
                            if (healthComp) {
                                healthComp.health -= classData.damage || 1.5;
                                hit = true;
                                
                                // Visual effect on enemy
                                scene.add.circle(enemyPos.x, enemyPos.y, TILE_SIZE/3, classData.color, 0.7)
                                    .setDepth(5000);
                                scene.tweens.add({
                                    targets: scene.children.getChildren().pop(),
                                    alpha: 0,
                                    scale: 1.5,
                                    duration: 200,
                                    onComplete: function(tween, targets) {
                                        targets[0].destroy();
                                    }
                                });
                            }
                        }
                    });
                    
                    return hit;
                };
                break;
                
            case 'chain':
            case 'crowdcontrol': // Support for renamed style
            case 'area':         // Support for renamed style 
            case 'directional':  // Support for renamed style
            case 'cone':         // Support for renamed style
            case 'beam':         // Support for renamed style
            case 'singletarget': // Support for renamed style
                console.log(`Using chain logic for ${classData.name} with style ${attackStyle}`);
                classData.specialAttack = (scene, follower, enemies) => {
                    // Early returns if no enemies or follower position is invalid
                    if (!enemies || enemies.length === 0) return false;
                    
                    const followerPos = follower.getComponent('PositionComponent');
                    if (!followerPos) return false;
                    
                    // Find closest enemy to attack first
                    let closestEnemy = null;
                    let closestDistance = Number.MAX_VALUE;
                    
                    enemies.forEach(enemy => {
                        // Skip if enemy doesn't have required components
                        const enemyPos = enemy.getComponent('PositionComponent');
                        if (!enemyPos) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            followerPos.x, followerPos.y,
                            enemyPos.x, enemyPos.y
                        );
                        
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestEnemy = enemy;
                        }
                    });
                    
                    // No valid enemies found or all are too far away
                    const range = TILE_SIZE * (classData.range || 8); 
                    console.log(`${classData.name} using range: ${classData.range} (${range} pixels)`);
                    
                    if (!closestEnemy || closestDistance > range) return false;
                    
                    // Begin chain lightning
                    const hitEnemies = new Set();
                    const lightningLines = [];
                    const maxChains = 3;
                    const damagePerHit = classData.damage || 2;
                    
                    // Create lightning from follower to first enemy
                    const closestEnemyPos = closestEnemy.getComponent('PositionComponent');
                    if (!closestEnemyPos) return false; // Safety check
                    
                    lightningLines.push({
                        x1: followerPos.x,
                        y1: followerPos.y,
                        x2: closestEnemyPos.x,
                        y2: closestEnemyPos.y
                    });
                    
                    // Damage first enemy
                    hitEnemies.add(closestEnemy.id);
                    const healthComp = closestEnemy.getComponent('HealthComponent');
                    if (healthComp) {
                        healthComp.health -= damagePerHit;
                    }
                    
                    // Chain to nearby enemies
                    let currentEnemy = closestEnemy;
                    let chainCount = 1;
                    
                    while (chainCount < maxChains) {
                        // Find next closest enemy not already hit
                        let nextEnemy = null;
                        let nextDistance = Number.MAX_VALUE;
                        const currentPos = currentEnemy.getComponent('PositionComponent');
                        
                        if (!currentPos) break; // Safety check
                        
                        enemies.forEach(enemy => {
                            if (hitEnemies.has(enemy.id)) return;
                            
                            const enemyPos = enemy.getComponent('PositionComponent');
                            if (!enemyPos) return;
                            
                            const distance = Phaser.Math.Distance.Between(
                                currentPos.x, currentPos.y,
                                enemyPos.x, enemyPos.y
                            );
                            
                            if (distance < nextDistance && distance < TILE_SIZE * 5) {
                                nextDistance = distance;
                                nextEnemy = enemy;
                            }
                        });
                        
                        if (!nextEnemy) break;
                        
                        // Add lightning chain
                        const nextPos = nextEnemy.getComponent('PositionComponent');
                        if (!nextPos) break; // Safety check
                        
                        lightningLines.push({
                            x1: currentPos.x,
                            y1: currentPos.y,
                            x2: nextPos.x,
                            y2: nextPos.y
                        });
                        
                        // Damage next enemy
                        hitEnemies.add(nextEnemy.id);
                        const nextHealthComp = nextEnemy.getComponent('HealthComponent');
                        if (nextHealthComp) {
                            nextHealthComp.health -= damagePerHit;
                        }
                        
                        // Move to next chain
                        currentEnemy = nextEnemy;
                        chainCount++;
                    }
                    
                    // Create lightning visuals
                    try {
                        for (const line of lightningLines) {
                            const lightning = scene.add.graphics();
                            lightning.lineStyle(2, classData.color, 1);
                            lightning.beginPath();
                            lightning.moveTo(line.x1, line.y1);
                            
                            // Create zigzag lightning effect
                            const segments = 3;
                            const dx = (line.x2 - line.x1) / segments;
                            const dy = (line.y2 - line.y1) / segments;
                            
                            for (let i = 1; i < segments; i++) {
                                const x = line.x1 + dx * i;
                                const y = line.y1 + dy * i;
                                const offset = (Math.random() - 0.5) * 10;
                                lightning.lineTo(x + offset, y + offset);
                            }
                            
                            lightning.lineTo(line.x2, line.y2);
                            lightning.strokePath();
                            
                            // Fade out
                            scene.tweens.add({
                                targets: lightning,
                                alpha: 0,
                                duration: 200,
                                onComplete: () => lightning.destroy()
                            });
                        }
                    } catch (error) {
                        console.error('Error creating lightning effect:', error);
                        // Don't let visual error crash the game
                    }
                    
                    return hitEnemies.size > 0;
                };
                break;
                
            default:
                console.warn(`Unknown attack style "${attackStyle}" for ${classData.name}, using default`);
                // Default attack if none of the above
                classData.specialAttack = (scene, follower, enemies) => {
                    // Simple default attack
                    const range = TILE_SIZE * 3;
                    let hit = false;
                    
                    const followerPos = follower.getComponent('PositionComponent');
                    if (!followerPos) return false;
                    
                    enemies.forEach(enemy => {
                        const enemyPos = enemy.getComponent('PositionComponent');
                        if (!enemyPos) return;
                        
                        const distance = Phaser.Math.Distance.Between(
                            followerPos.x, followerPos.y, 
                            enemyPos.x, enemyPos.y
                        );
                        
                        if (distance <= range) {
                            // Apply damage
                            const healthComp = enemy.getComponent('HealthComponent');
                            if (healthComp) {
                                healthComp.health -= 1;
                                hit = true;
                            }
                        }
                    });
                    
                    return hit;
                };
        }
    }

    // Get a specific engineer class by name
    getEngineerClass(name) {
        const key = this.getClassKey(name);
        return this.engineerClasses[key];
    }
    
    // Get a specific commander class by name
    getCommanderClass(name) {
        const key = this.getClassKey(name);
        return this.commanderClasses[key];
    }
    
    // Get all engineer classes
    getAllEngineerClasses() {
        return this.engineerClasses;
    }
    
    // Get all commander classes
    getAllCommanderClasses() {
        return this.commanderClasses;
    }

    static createTextAreaWithCSVData(id, csvData) {
        // Remove any existing element with this ID
        const existingElement = document.getElementById(id);
        if (existingElement) {
            existingElement.remove();
        }
        
        // Create a new hidden text area element
        const textArea = document.createElement('textarea');
        textArea.id = id;
        textArea.style.display = 'none'; // Hide it
        textArea.textContent = csvData;
        
        // Add it to the document
        document.body.appendChild(textArea);
        console.log(`Created ${id} data element for offline loading`);
        
        return textArea;
    }
    
    static setupOfflineData(engineerCSV, commanderCSV) {
        ClassLoader.createTextAreaWithCSVData('engineerClassesData', engineerCSV);
        ClassLoader.createTextAreaWithCSVData('commanderClassesData', commanderCSV);
        console.log('Offline class data setup complete');
        return true;
    }

    loadDefaultEngineerClasses() {
        // Default engineer classes to use when CSV loading fails
        const defaultEngineers = [
            {
                type: 'engineer',
                name: 'chronotemporal',
                color: 0x00FFFF,
                damage: 2,
                range: 8,
                speed: 1.5,
                cooldown: 3,
                health: 10,
                attackstyle: 'magic',
                specialability: 'slowTime'
            },
            {
                type: 'engineer',
                name: 'shroomPixie',
                color: 0xFF00AA,
                damage: 1.5,
                range: 6,
                speed: 2,
                cooldown: 2,
                health: 8,
                attackstyle: 'chain',
                specialability: 'sporeCloud'
            },
            {
                type: 'engineer',
                name: 'junkrat',
                color: 0xFFAA00,
                damage: 3,
                range: 4,
                speed: 1,
                cooldown: 4,
                health: 12,
                attackstyle: 'ranged',
                specialability: 'scrapBomb'
            }
        ];
        
        defaultEngineers.forEach(engineerData => {
            this.addSpecialAttackFunction(engineerData);
            const key = this.getClassKey(engineerData.name);
            this.engineerClasses[key] = engineerData;
        });
        
        console.log('Loaded default engineer classes:', Object.keys(this.engineerClasses));
    }
    
    loadDefaultCommanderClasses() {
        console.log("Loading default commander classes...");
        
        // Default commander classes to use when CSV loading fails
        const defaultCommanders = [
            {
                type: 'commander',
                name: 'warrior',
                color: 0xFF0000,
                damage: 3,
                range: 50, // Increased range for warrior to be clearly visible
                speed: 1,
                cooldown: 2,
                health: 20,
                attackstyle: 'melee',
                specialability: 'whirlwind'
            },
            {
                type: 'commander',
                name: 'archer',
                color: 0x00FF00,
                damage: 2,
                range: 6,
                speed: 1.5,
                cooldown: 3,
                health: 15,
                attackstyle: 'ranged',
                specialability: 'multishot'
            },
            {
                type: 'commander',
                name: 'mage',
                color: 0xFF00FF,
                damage: 2.5,
                range: 5,
                speed: 1.2,
                cooldown: 4,
                health: 12,
                attackstyle: 'magic',
                specialability: 'freeze'
            }
        ];
        
        defaultCommanders.forEach(commanderData => {
            this.addSpecialAttackFunction(commanderData);
            const key = this.getClassKey(commanderData.name);
            this.commanderClasses[key] = commanderData;
            console.log(`Added default commander '${commanderData.name}' with key '${key}', range=${commanderData.range}`);
        });
        
        console.log('Loaded default commander classes:', Object.keys(this.commanderClasses));
        // Log warrior details specifically
        if (this.commanderClasses['warrior']) {
            console.log('Default warrior range:', this.commanderClasses['warrior'].range);
        }
    }
}

export default ClassLoader; 