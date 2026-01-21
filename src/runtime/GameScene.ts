import { Scene } from '../engine/Scene';
import { Renderer } from '../engine/Renderer';
import { Level } from '../data/Level';
import { EntitySystem, Entity } from '../systems/EntitySystem';
import { MovementSystem } from '../systems/MovementSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CameraSystem } from '../systems/CameraSystem';
// import { AnimationSystem } from '../systems/AnimationSystem'; // Not used yet
import { CombatSystem } from '../systems/CombatSystem';
import { Input } from '../engine/Input';
import { AssetLoader } from '../engine/AssetLoader';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { NPC } from '../entities/NPC';
import { Item } from '../entities/Item';
import { Transform } from '../components/Transform';
import { Vector2 } from '../utils/Vector2';
import { Time } from '../engine/Time';

export class GameScene extends Scene {
  private level: Level | null = null;
  private entitySystem: EntitySystem;
  private movementSystem: MovementSystem;
  private collisionSystem: CollisionSystem;
  private cameraSystem: CameraSystem;
  // private animationSystem: AnimationSystem; // Not used yet - requires animation states
  private combatSystem: CombatSystem;
  private playerEntity: Entity | null = null;

  constructor() {
    super('GameScene');
    this.entitySystem = new EntitySystem();
    this.movementSystem = new MovementSystem(this.entitySystem);
    this.collisionSystem = new CollisionSystem(this.entitySystem);
    this.cameraSystem = new CameraSystem();
    // this.animationSystem = new AnimationSystem(); // Not used yet
    this.combatSystem = new CombatSystem(this.entitySystem);
  }

  init(): void {
    // Scene initialized, level will be loaded via loadLevel()
  }

  loadLevel(level: Level): void {
    // Clear existing entities
    const existingEntities = this.entitySystem.getAllEntities();
    existingEntities.forEach(entity => {
      this.entitySystem.removeEntity(entity.id);
    });

    this.level = level;
    this.playerEntity = null;

    // Create entities from level data
    for (const levelEntity of level.entities) {
      let entity: Entity | null = null;

      switch (levelEntity.type) {
        case 'player':
          entity = Player.create(this.entitySystem, levelEntity.x, levelEntity.y);
          this.playerEntity = entity;
          break;
        case 'enemy':
          entity = Enemy.create(this.entitySystem, levelEntity.x, levelEntity.y);
          break;
        case 'npc':
          entity = NPC.create(this.entitySystem, levelEntity.x, levelEntity.y);
          break;
        case 'item':
          entity = Item.create(this.entitySystem, levelEntity.x, levelEntity.y);
          break;
        default:
          console.warn(`Unknown entity type: ${levelEntity.type}`);
      }

      // Apply any custom properties
      if (entity && levelEntity.properties) {
        // Properties can be applied to components if needed
      }
    }

    // Set camera to follow player
    if (this.playerEntity) {
      const transform = this.playerEntity.getComponent<Transform>('transform');
      if (transform) {
        this.cameraSystem.camera.setTarget(transform);
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.level) return;

    // Handle player input
    if (this.playerEntity) {
      const direction = new Vector2(0, 0);
      
      if (Input.getKey('w') || Input.getKey('W') || Input.getKey('ArrowUp')) {
        direction.y -= 1;
      }
      if (Input.getKey('s') || Input.getKey('S') || Input.getKey('ArrowDown')) {
        direction.y += 1;
      }
      if (Input.getKey('a') || Input.getKey('A') || Input.getKey('ArrowLeft')) {
        direction.x -= 1;
      }
      if (Input.getKey('d') || Input.getKey('D') || Input.getKey('ArrowRight')) {
        direction.x += 1;
      }

      if (direction.magnitude() > 0) {
        this.movementSystem.moveEntity(this.playerEntity, direction, deltaTime);
      }
    }

    // Update systems
    this.movementSystem.update(deltaTime);
    this.collisionSystem.update(deltaTime);
    // AnimationSystem requires animation states array - skip for now as entities don't have animation states yet
    // this.animationSystem.update(deltaTime, []);
    this.combatSystem.update(deltaTime);

  }

  render(renderer: Renderer): void {
    if (!this.level) return;

    // Update camera with viewport size
    const deltaTime = Time.getDeltaTime();
    this.cameraSystem.update(deltaTime, renderer.getWidth(), renderer.getHeight());

    // Apply camera transform
    renderer.save();
    const viewportWidth = renderer.getWidth();
    const viewportHeight = renderer.getHeight();
    const camera = this.cameraSystem.camera;

    renderer.translate(viewportWidth / 2, viewportHeight / 2);
    renderer.scale(camera.zoom, camera.zoom);
    renderer.translate(-camera.position.x, -camera.position.y);

    // Render tilemap
    this.renderTilemap(renderer);

    // Render entities
    this.renderEntities(renderer);

    renderer.restore();
  }

  private renderTilemap(renderer: Renderer): void {
    if (!this.level) return;

    const tilemap = this.level.tilemap;
    const tilesetImage = AssetLoader.getImage(tilemap.tilesetImage);
    if (!tilesetImage) return;

    const tileSize = tilemap.tileSize;
    const tilesPerRow = tilemap.tilesetColumns;

    for (const layer of tilemap.layers) {
      if (!layer.visible) continue;

      const ctx = renderer.getContext();
      ctx.globalAlpha = layer.opacity;

      for (let y = 0; y < tilemap.height; y++) {
        for (let x = 0; x < tilemap.width; x++) {
          const tileId = layer.data[y * tilemap.width + x];
          if (tileId === 0) continue;

          const tileX = x * tileSize;
          const tileY = y * tileSize;

          // Calculate source position in tileset
          const srcX = ((tileId - 1) % tilesPerRow) * tileSize;
          const srcY = Math.floor((tileId - 1) / tilesPerRow) * tileSize;

          renderer.drawImage(
            tilesetImage,
            tileX,
            tileY,
            tileSize,
            tileSize,
            srcX,
            srcY,
            tileSize,
            tileSize
          );
        }
      }

      ctx.globalAlpha = 1.0;
    }
  }

  private renderEntities(renderer: Renderer): void {
    const entities = this.entitySystem.getAllEntities();

    for (const entity of entities) {
      const transform = entity.getComponent<Transform>('transform');
      const sprite = entity.getComponent<any>('sprite');

      if (!transform || !sprite) continue;

      const x = transform.position.x;
      const y = transform.position.y;

      // Try to render sprite, fallback to colored rectangle
      const spriteImage = AssetLoader.getImage(sprite.imageName);
      if (spriteImage) {
        const ctx = renderer.getContext();
        ctx.globalAlpha = sprite.opacity || 1.0;
        
        renderer.drawImage(
          spriteImage,
          x + sprite.offsetX,
          y + sprite.offsetY,
          sprite.width,
          sprite.height,
          0,
          0,
          spriteImage.width,
          spriteImage.height
        );
        
        ctx.globalAlpha = 1.0;
      } else {
        // Fallback to colored rectangle based on entity type
        let color = '#00ff00'; // Default green
        if (entity.name === 'Player') color = '#4a9eff';
        else if (entity.name.includes('Enemy')) color = '#ff4444';
        else if (entity.name === 'NPC') color = '#ffff44';
        else if (entity.name === 'Item') color = '#ff44ff';

        renderer.fillRect(
          x + sprite.offsetX,
          y + sprite.offsetY,
          sprite.width,
          sprite.height,
          color
        );
        renderer.strokeRect(
          x + sprite.offsetX,
          y + sprite.offsetY,
          sprite.width,
          sprite.height,
          '#ffffff',
          1
        );
      }
    }
  }

  destroy(): void {
    // Cleanup
    const entities = this.entitySystem.getAllEntities();
    entities.forEach(entity => {
      this.entitySystem.removeEntity(entity.id);
    });
    this.level = null;
    this.playerEntity = null;
  }
}

