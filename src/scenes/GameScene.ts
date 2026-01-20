import { Scene } from '../engine/Scene';
import { Renderer } from '../engine/Renderer';
import { AssetLoader } from '../engine/AssetLoader';
import { Time } from '../engine/Time';
import { EntityManager } from '../entities/EntityManager';
import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { Enemy } from '../entities/Enemy';
import { Item } from '../entities/Item';
import { MovementSystem } from '../systems/MovementSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { EntitySystem } from '../systems/EntitySystem';
import { InventorySystem } from '../systems/InventorySystem';
import { CombatSystem } from '../systems/CombatSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { TilemapRenderer } from '../systems/TilemapRenderer';
import { Level } from '../data/Level';
import { Tilemap } from '../data/Tilemap';
import { DialogueNode } from '../components/Dialogue';
import { Transform } from '../components/Transform';
import { WorldGenerator } from '../generators/WorldGenerator';
import { WORLD_ASSET_PATHS } from '../generators/AssetManifest';

export class GameScene extends Scene {
  private entityManager: EntityManager;
  private movementSystem: MovementSystem;
  private cameraSystem: CameraSystem;
  private collisionSystem: CollisionSystem;
  private entitySystem: EntitySystem;
  private inventorySystem: InventorySystem;
  private combatSystem: CombatSystem;
  private dialogueSystem: DialogueSystem;
  private level: Level | null = null;
  private player: Player | null = null;
  private isRegenerating: boolean = false;

  constructor() {
    super('GameScene');
    this.entityManager = new EntityManager();
    this.movementSystem = new MovementSystem(this.entityManager);
    this.cameraSystem = new CameraSystem();
    this.collisionSystem = new CollisionSystem(this.entityManager);
    this.entitySystem = new EntitySystem(this.entityManager);
    this.inventorySystem = new InventorySystem(this.entityManager);
    this.combatSystem = new CombatSystem(this.entityManager);
    this.dialogueSystem = new DialogueSystem(this.entityManager);
  }

  async init(): Promise<void> {
    // Initialize world generator with asset manifest (only once)
    if (!WorldGenerator.getAssetCount()) {
      console.log('Initializing world generator with', WORLD_ASSET_PATHS.length, 'assets...');
      await WorldGenerator.initialize(WORLD_ASSET_PATHS);
      console.log('World generator initialized');
    }

    // Use window dimensions for room size (renderer not available in init)
    await this.generateWorld();
    this.createEntities();
  }

  private async generateWorld(renderer?: Renderer): Promise<void> {
    // Get screen dimensions for room-based generation
    const screenWidth = renderer?.getWidth() || window.innerWidth;
    const screenHeight = renderer?.getHeight() || window.innerHeight;

    // Generate a random world that fits the screen
    const worldConfig = {
      width: 50, // Not used when roomBased is true
      height: 50, // Not used when roomBased is true
      tileSize: 16, // Assets are 16x16
      seed: Math.floor(Math.random() * 1000000), // Random seed
      terrainDensity: 0.6, // 60% of tiles will have terrain
      structureDensity: 0.2, // 20% structure density
      screenWidth: screenWidth,
      screenHeight: screenHeight,
      roomBased: true // Generate room that fits screen
    };

    console.log('Generating random world (room-based)...');
    this.level = await WorldGenerator.generate(worldConfig);
    console.log('World generated successfully');

    this.collisionSystem.setTilemap(this.level.tilemap);
    
    // Set camera to center of room (fixed position)
    const centerX = (this.level.tilemap.width * this.level.tilemap.tileSize) / 2;
    const centerY = (this.level.tilemap.height * this.level.tilemap.tileSize) / 2;
    this.cameraSystem.setFixedPosition(centerX, centerY);
    
    // Set zoom to 1 to ensure proper scaling (room should already fit screen)
    this.cameraSystem.setZoom(1);
  }

  private createEntities(): void {
    if (!this.level) return;

    // Create player at center of world (safe spawn location)
    const spawnX = (this.level.tilemap.width * this.level.tilemap.tileSize) / 2;
    const spawnY = (this.level.tilemap.height * this.level.tilemap.tileSize) / 2;
    this.player = new Player(spawnX, spawnY);
    this.entityManager.registerEntity(this.player);
    // Camera is fixed, no need to set target

    // Create a test NPC with dialogue
    const npc = new NPC(400, 300, 'Merchant');
    const npcDialogue: DialogueNode[] = [
      {
        id: 'greeting',
        speaker: 'Merchant',
        text: 'Welcome, traveler! How can I help you?',
        choices: [
          { text: 'Buy items', nextDialogue: 'buy' },
          { text: 'Sell items', nextDialogue: 'sell' },
          { text: 'Goodbye', nextDialogue: 'end' }
        ]
      },
      {
        id: 'buy',
        speaker: 'Merchant',
        text: 'I have many fine wares!',
        nextDialogue: 'greeting'
      },
      {
        id: 'sell',
        speaker: 'Merchant',
        text: 'Show me what you have.',
        nextDialogue: 'greeting'
      },
      {
        id: 'end',
        speaker: 'Merchant',
        text: 'Safe travels!'
      }
    ];
    npc.setDialogue(npcDialogue);
    this.entityManager.registerEntity(npc);

    // Create a test enemy
    const enemy = new Enemy(500, 400, 'Goblin');
    this.entityManager.registerEntity(enemy);

    // Create a test item
    const item = new Item(300, 300, {
      id: 'health_potion',
      name: 'Health Potion',
      type: 'consumable',
      quantity: 1,
      data: { healAmount: 50 }
    });
    this.entityManager.registerEntity(item);
  }

  async regenerateWorld(renderer?: Renderer): Promise<void> {
    if (this.isRegenerating) return;
    
    this.isRegenerating = true;
    const button = document.getElementById('regenerateButton') as HTMLButtonElement;
    if (button) {
      button.disabled = true;
      button.textContent = '🔄 Generating...';
    }

    try {
      // Clear all entities
      this.entityManager.clear();
      this.player = null;

      // Generate new world (pass renderer if available for accurate screen dimensions)
      await this.generateWorld(renderer);
      
      // Recreate entities
      this.createEntities();

      console.log('World regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating world:', error);
    } finally {
      this.isRegenerating = false;
      if (button) {
        button.disabled = false;
        button.textContent = '🔄 Regenerate World';
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.player) return;

    // Update systems
    this.movementSystem.handlePlayerInput(this.player);
    this.movementSystem.update(deltaTime);
    this.collisionSystem.update(deltaTime);
    this.inventorySystem.update(deltaTime);
    this.combatSystem.update(deltaTime);
    this.dialogueSystem.update(deltaTime);
    this.entitySystem.update(deltaTime);
    
    // Update camera (needs renderer for bounds, but we'll update position here)
    // Camera position update happens in render to ensure it's after all movement
  }

  render(renderer: Renderer): void {
    if (!this.level) return;

    // Update camera first (needs renderer for screen dimensions)
    this.cameraSystem.update(Time.getDeltaTime(), renderer);

    const cameraPos = this.cameraSystem.getPosition();
    const viewWidth = renderer.getWidth() / this.cameraSystem.getZoom();
    const viewHeight = renderer.getHeight() / this.cameraSystem.getZoom();

    // Render tilemap
    TilemapRenderer.render(
      renderer,
      this.level.tilemap,
      cameraPos.x,
      cameraPos.y,
      viewWidth,
      viewHeight
    );

    // Render entities
    this.entitySystem.render(renderer);

    // Render dialogue
    this.dialogueSystem.render(renderer);
  }

  destroy(): void {
    this.entityManager.clear();
  }
}

