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
import { Collider } from '../components/Collider';
import { Vector2 } from '../utils/Vector2';
import { Time } from '../engine/Time';
import { AudioManager } from '../engine/AudioManager';

export class GameScene extends Scene {
  private level: Level | null = null;
  private entitySystem: EntitySystem;
  private movementSystem: MovementSystem;
  private collisionSystem: CollisionSystem;
  private cameraSystem: CameraSystem;
  // private animationSystem: AnimationSystem; // Not used yet - requires animation states
  private combatSystem: CombatSystem;
  private playerEntity: Entity | null = null;
  private walkFrameTime: number = 0;
  private walkFrameIndex: number = 0;
  private readonly walkFrameDuration: number = 0.08;
  private walkFrameRow: number = 0;
  private detectedFrameCounts: Map<string, number[]> = new Map();
  private frameDetectCanvas: HTMLCanvasElement | null = null;
  private frameDetectCtx: CanvasRenderingContext2D | null = null;
  private activeDoorKey: string | null = null;
  private loadingDoorTarget: string | null = null;
  private colliderToEntity: Map<Collider, Entity> = new Map();
  private entitySoundConfig: Map<string, { collision?: string; interact?: string }> = new Map();
  private activePlayerCollisions: Set<string> = new Set();
  private enemyBehaviorConfig: Map<string, string> = new Map();
  private enemyBehaviorState: Map<string, { direction: Vector2; timer: number }> = new Map();
  private enemyAnimationState: Map<string, { time: number; index: number; row: number }> = new Map();
  private readonly enemyFrameDuration: number = 0.14;

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
    this.walkFrameTime = 0;
    this.walkFrameIndex = 0;
    this.walkFrameRow = 0;
    this.detectedFrameCounts.clear();
    this.activeDoorKey = null;
    this.colliderToEntity.clear();
    this.entitySoundConfig.clear();
    this.activePlayerCollisions.clear();
    this.enemyBehaviorConfig.clear();
    this.enemyBehaviorState.clear();
    this.enemyAnimationState.clear();

    // Create entities from level data
    for (const levelEntity of level.entities) {
      let entity: Entity | null = null;

      switch (levelEntity.type) {
        case 'player':
          entity = Player.create(this.entitySystem, levelEntity.x, levelEntity.y);
          this.playerEntity = entity;
          break;
        case 'enemy':
          {
            const resolveSpriteKey = (raw: string): string => {
              const trimmed = raw.trim();
              if (!trimmed) return '';
              if (trimmed.startsWith('enemy:')) {
                return trimmed;
              }
              const withoutPath = trimmed.split('/').pop() ?? trimmed;
              const baseName = withoutPath.replace(/\.[^/.]+$/, '');
              const withPrefix = `enemy:${baseName}`;
              if (AssetLoader.getImage(withPrefix)) {
                return withPrefix;
              }
              if (AssetLoader.getImage(baseName)) {
                return baseName;
              }
              return trimmed;
            };
            const spriteName = typeof levelEntity.properties?.enemySprite === 'string'
              ? resolveSpriteKey(levelEntity.properties.enemySprite)
              : '';
            entity = Enemy.create(
              this.entitySystem,
              levelEntity.x,
              levelEntity.y,
              'Enemy',
              50,
              spriteName.length > 0 ? spriteName : undefined
            );
          }
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

      if (entity) {
        this.registerCollider(entity);
      }

      if (entity && levelEntity.type === 'enemy') {
        const behavior = typeof levelEntity.properties?.enemyAI === 'string'
          ? levelEntity.properties.enemyAI.trim()
          : '';
        this.enemyBehaviorConfig.set(entity.id, behavior || 'idle');
      }

      // Apply any custom properties
      if (entity && levelEntity.properties) {
        this.applyEntitySoundProperties(entity, levelEntity.properties);
      }
    }

    if (this.level.spawnPoint) {
      if (!this.playerEntity) {
        this.playerEntity = Player.create(this.entitySystem, this.level.spawnPoint.x, this.level.spawnPoint.y);
        this.registerCollider(this.playerEntity);
      } else {
        const transform = this.playerEntity.getComponent<Transform>('transform');
        if (transform) {
          transform.position.x = this.level.spawnPoint.x;
          transform.position.y = this.level.spawnPoint.y;
        }
      }
    } else if (!this.playerEntity) {
      this.playerEntity = Player.create(this.entitySystem, 0, 0);
      this.registerCollider(this.playerEntity);
    }

    // Set camera to follow player
    if (this.playerEntity) {
      const transform = this.playerEntity.getComponent<Transform>('transform');
      if (transform) {
        this.cameraSystem.camera.setTarget(transform);
      }
    }

    this.applyLevelBackgroundSound();
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

    const playerTransform = this.playerEntity?.getComponent<Transform>('transform') || null;
    const playerCollider = this.playerEntity?.getComponent<Collider>('collider') || null;
    const prevPlayerPos = playerTransform ? playerTransform.position.copy() : null;

    // Update systems
    this.updateEnemyAI(deltaTime);
    this.movementSystem.update(deltaTime);
    this.collisionSystem.update(deltaTime);
    this.updateEnemyAnimations(deltaTime);
    // AnimationSystem requires animation states array - skip for now as entities don't have animation states yet
    // this.animationSystem.update(deltaTime, []);
    this.combatSystem.update(deltaTime);

    this.updatePlayerAudioTriggers();

    if (this.level && playerTransform && playerCollider && prevPlayerPos) {
      playerCollider.setPosition(playerTransform.position.x, playerTransform.position.y);
      if (this.isCollidingWithTilemap(playerCollider, this.level.tilemap)) {
        playerTransform.position.x = prevPlayerPos.x;
        playerTransform.position.y = prevPlayerPos.y;
        playerCollider.setPosition(prevPlayerPos.x, prevPlayerPos.y);
        const movement = this.playerEntity?.getComponent<any>('movement');
        if (movement) {
          movement.velocity.x = 0;
          movement.velocity.y = 0;
        }
      }
    }

    if (this.level && playerCollider) {
      this.handleDoorTransitions(playerCollider);
    }

    // Drive walk animation from movement velocity
    if (this.playerEntity) {
      const movement = this.playerEntity.getComponent<any>('movement');
      const sprite = this.playerEntity.getComponent<any>('sprite');
      if (movement && sprite) {
        const spriteImage = AssetLoader.getImage(sprite.imageName);
        const frameCount = spriteImage
          ? this.getFrameCountForSprite(sprite, spriteImage)
          : 1;
        const speed = movement.velocity.magnitude();
        if (speed > 1) {
          const absX = Math.abs(movement.velocity.x);
          const absY = Math.abs(movement.velocity.y);
          if (absX > absY) {
            this.walkFrameRow = movement.velocity.x < 0 ? 1 : 3;
          } else {
            this.walkFrameRow = movement.velocity.y < 0 ? 0 : 2;
          }
          this.walkFrameTime += deltaTime;
          while (this.walkFrameTime >= this.walkFrameDuration) {
            this.walkFrameTime -= this.walkFrameDuration;
            this.walkFrameIndex = (this.walkFrameIndex + 1) % frameCount;
          }
          sprite.frameIndex = this.walkFrameIndex;
          sprite.frameRow = this.walkFrameRow;
        } else {
          this.walkFrameTime = 0;
          this.walkFrameIndex = 0;
          sprite.frameIndex = 0;
          sprite.frameRow = this.walkFrameRow;
        }
      }
    }

  }

  private updateEnemyAI(deltaTime: number): void {
    const enemies = this.entitySystem.getEntitiesWithComponent('movement');
    const playerTransform = this.playerEntity?.getComponent<Transform>('transform') || null;

    for (const enemy of enemies) {
      if (enemy.name !== 'Enemy') continue;
      const movement = enemy.getComponent<any>('movement');
      const transform = enemy.getComponent<Transform>('transform');
      if (!movement || !transform) continue;

      const behavior = this.enemyBehaviorConfig.get(enemy.id) || 'idle';
      const state = this.enemyBehaviorState.get(enemy.id) || {
        direction: new Vector2(1, 0),
        timer: 0
      };

      let desiredDirection = new Vector2(0, 0);

      if (behavior === 'chase-player' && playerTransform) {
        desiredDirection = Vector2.subtract(playerTransform.position, transform.position);
      } else if (behavior === 'patrol-horizontal') {
        state.timer -= deltaTime;
        if (state.timer <= 0) {
          state.direction = state.direction.x >= 0 ? new Vector2(-1, 0) : new Vector2(1, 0);
          state.timer = 1.8;
        }
        desiredDirection = state.direction.copy();
      } else if (behavior === 'patrol-vertical') {
        state.timer -= deltaTime;
        if (state.timer <= 0) {
          state.direction = state.direction.y >= 0 ? new Vector2(0, -1) : new Vector2(0, 1);
          state.timer = 1.8;
        }
        desiredDirection = state.direction.copy();
      } else if (behavior === 'wander') {
        state.timer -= deltaTime;
        if (state.timer <= 0) {
          const angle = Math.random() * Math.PI * 2;
          state.direction = new Vector2(Math.cos(angle), Math.sin(angle));
          state.timer = 1.2 + Math.random() * 1.8;
        }
        desiredDirection = state.direction.copy();
      }

      if (desiredDirection.magnitude() > 0) {
        this.movementSystem.moveEntity(enemy, desiredDirection, deltaTime);
      }

      this.enemyBehaviorState.set(enemy.id, state);
    }
  }

  private updateEnemyAnimations(deltaTime: number): void {
    const enemies = this.entitySystem.getEntitiesWithComponent('movement');

    for (const enemy of enemies) {
      if (enemy.name !== 'Enemy') continue;
      const movement = enemy.getComponent<any>('movement');
      const sprite = enemy.getComponent<any>('sprite');
      if (!movement || !sprite) continue;

      const spriteImage = AssetLoader.getImage(sprite.imageName);
      if (!spriteImage) continue;

      let frameCount = 1;
      if (spriteImage.width % 3 === 0 && spriteImage.height % 4 === 0) {
        sprite.frameWidth = spriteImage.width / 3;
        sprite.frameHeight = spriteImage.height / 4;
        frameCount = 3;
      } else {
        frameCount = this.getFrameCountForSprite(sprite, spriteImage);
      }

      const state = this.enemyAnimationState.get(enemy.id) || { time: 0, index: 0, row: 0 };
      const speed = movement.velocity.magnitude();

      if (speed > 1) {
        const absX = Math.abs(movement.velocity.x);
        const absY = Math.abs(movement.velocity.y);
        if (absX > absY) {
          state.row = movement.velocity.x < 0 ? 1 : 2;
        } else {
          state.row = movement.velocity.y > 0 ? 0 : 3;
        }
        state.time += deltaTime;
        while (state.time >= this.enemyFrameDuration) {
          state.time -= this.enemyFrameDuration;
          state.index = (state.index + 1) % frameCount;
        }
      } else {
        state.time = 0;
        state.index = 0;
      }

      sprite.frameIndex = state.index;
      sprite.frameRow = state.row;
      this.enemyAnimationState.set(enemy.id, state);
    }
  }

  private applyEntitySoundProperties(entity: Entity, properties: Record<string, any>): void {
    const collisionSound = typeof properties.soundOnCollision === 'string'
      ? properties.soundOnCollision.trim()
      : '';
    const interactSound = typeof properties.soundOnInteract === 'string'
      ? properties.soundOnInteract.trim()
      : '';
    const hasSound = collisionSound.length > 0 || interactSound.length > 0;
    if (hasSound) {
      this.entitySoundConfig.set(entity.id, {
        collision: collisionSound || undefined,
        interact: interactSound || undefined
      });
    }

  }

  private registerCollider(entity: Entity): void {
    const collider = entity.getComponent<Collider>('collider');
    if (collider) {
      this.colliderToEntity.set(collider, entity);
    }
  }

  private applyLevelBackgroundSound(): void {
    if (!this.level || !this.level.backgroundSound) {
      AudioManager.stopBackground();
      return;
    }
    AudioManager.playBackground(this.level.backgroundSound);
  }

  private updatePlayerAudioTriggers(): void {
    if (!this.playerEntity) return;
    const playerCollider = this.playerEntity.getComponent<Collider>('collider');
    if (!playerCollider) return;

    const nextCollisions: Set<string> = new Set();
    const interactPressed = Input.getKeyDown('e') || Input.getKeyDown('E');

    for (const [collider, entity] of this.colliderToEntity.entries()) {
      if (entity.id === this.playerEntity.id) continue;
      if (!playerCollider.bounds.intersects(collider.bounds)) continue;

      nextCollisions.add(entity.id);
      const config = this.entitySoundConfig.get(entity.id);
      if (config?.collision && !this.activePlayerCollisions.has(entity.id)) {
        AudioManager.playSound(config.collision);
      }
      if (interactPressed && config?.interact) {
        AudioManager.playSound(config.interact);
      }
    }

    this.activePlayerCollisions = nextCollisions;
  }

  private isCollidingWithTilemap(collider: Collider, tilemap: Level['tilemap']): boolean {
    const tileSize = tilemap.tileSize;
    const minX = Math.floor(collider.bounds.x / tileSize);
    const minY = Math.floor(collider.bounds.y / tileSize);
    const maxX = Math.floor((collider.bounds.x + collider.bounds.width - 1) / tileSize);
    const maxY = Math.floor((collider.bounds.y + collider.bounds.height - 1) / tileSize);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (tilemap.getCollision(x, y)) {
          return true;
        }
      }
    }
    return false;
  }

  private handleDoorTransitions(playerCollider: Collider): void {
    if (!this.level) return;
    const door = this.getDoorAtCollider(playerCollider, this.level);
    if (!door) {
      this.activeDoorKey = null;
      return;
    }

    const doorKey = `${door.x},${door.y},${door.targetLevel}`;
    if (this.activeDoorKey === doorKey) return;
    this.activeDoorKey = doorKey;
    this.loadDoorTarget(door.targetLevel);
  }

  private getDoorAtCollider(collider: Collider, level: Level): Level['doors'][number] | null {
    const tileSize = level.tilemap.tileSize;
    const minX = Math.floor(collider.bounds.x / tileSize);
    const minY = Math.floor(collider.bounds.y / tileSize);
    const maxX = Math.floor((collider.bounds.x + collider.bounds.width - 1) / tileSize);
    const maxY = Math.floor((collider.bounds.y + collider.bounds.height - 1) / tileSize);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const door = level.getDoorAt(x, y);
        if (door) {
          return door;
        }
      }
    }

    return null;
  }

  private loadDoorTarget(targetLevelName: string): void {
    const store = (window as unknown as { __levelStore?: Map<string, string> }).__levelStore;
    const stored = store?.get(targetLevelName);
    if (stored) {
      this.loadLevelFromJson(stored);
      return;
    }

    if (this.loadingDoorTarget === targetLevelName) return;
    this.loadingDoorTarget = targetLevelName;

    const safeName = targetLevelName.replace(/[^\w\-]+/g, '_').toLowerCase();
    const encodedName = encodeURIComponent(targetLevelName);
    const candidates = [
      `/levels/${encodedName}.json`,
      `/levels/${safeName}.json`
    ];

    const tryFetch = (index: number): Promise<string> => {
      if (index >= candidates.length) {
        return Promise.reject(new Error('No matching level file.'));
      }
      return fetch(candidates[index])
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.text();
        })
        .catch(() => tryFetch(index + 1));
    };

    tryFetch(0)
      .then((response) => {
        this.loadLevelFromJson(response);
      })
      .catch((error: Error) => {
        console.warn(`Door target level "${targetLevelName}" not found via file fetch.`, error);
      })
      .finally(() => {
        if (this.loadingDoorTarget === targetLevelName) {
          this.loadingDoorTarget = null;
        }
      });
  }

  private loadLevelFromJson(levelData: string): void {
    try {
      const levelJson = JSON.parse(levelData);
      const nextLevel = Level.fromJSON(levelJson);
      this.ensureTilesetLoaded(nextLevel);
      this.loadLevel(nextLevel);
    } catch (error) {
      console.error('Failed to load door target level:', error);
    }
  }

  private ensureTilesetLoaded(level: Level): void {
    if (!level.tilemap.tilesetImage) return;
    const existingImage = AssetLoader.getImage(level.tilemap.tilesetImage);
    if (existingImage || level.tilemap.tilesetImage === 'default-tileset') return;

    const tilesetPath = level.tilemap.tilesetImage.startsWith('/')
      ? level.tilemap.tilesetImage
      : `/assets/${level.tilemap.tilesetImage}`;
    AssetLoader.loadImage(tilesetPath, level.tilemap.tilesetImage).catch((error) => {
      console.warn(`Failed to load tileset ${level.tilemap.tilesetImage}:`, error);
    });
  }

  private getFrameCountForSprite(sprite: any, spriteImage: HTMLImageElement): number {
    const frameWidth = sprite.frameWidth || sprite.width;
    const frameHeight = sprite.frameHeight || sprite.height;
    const maxColumns = Math.max(1, Math.floor(spriteImage.width / frameWidth));
    const maxRows = Math.max(1, Math.floor(spriteImage.height / frameHeight));
    const row = Math.max(0, Math.min(sprite.frameRow || 0, maxRows - 1));
    const cacheKey = `${sprite.imageName}:${frameWidth}:${frameHeight}`;
    const cached = this.detectedFrameCounts.get(cacheKey);
    if (cached && cached[row]) {
      return cached[row];
    }

    const counts = cached || new Array(maxRows).fill(0);
    const detected = this.detectFrameCount(spriteImage, frameWidth, frameHeight, row, maxColumns);
    counts[row] = detected;
    this.detectedFrameCounts.set(cacheKey, counts);
    return detected;
  }

  private detectFrameCount(
    spriteImage: HTMLImageElement,
    frameWidth: number,
    frameHeight: number,
    row: number,
    maxColumns: number
  ): number {
    if (!this.frameDetectCanvas) {
      this.frameDetectCanvas = document.createElement('canvas');
      this.frameDetectCtx = this.frameDetectCanvas.getContext('2d');
    }
    if (!this.frameDetectCtx || !this.frameDetectCanvas) {
      return maxColumns;
    }

    this.frameDetectCanvas.width = frameWidth;
    this.frameDetectCanvas.height = frameHeight;

    let count = 0;
    for (let col = 0; col < maxColumns; col++) {
      this.frameDetectCtx.clearRect(0, 0, frameWidth, frameHeight);
      this.frameDetectCtx.drawImage(
        spriteImage,
        col * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
        0,
        0,
        frameWidth,
        frameHeight
      );
      const data = this.frameDetectCtx.getImageData(0, 0, frameWidth, frameHeight).data;
      let hasVisible = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] + data[i + 1] + data[i + 2] > 20) {
          hasVisible = true;
          break;
        }
      }
      if (hasVisible) {
        count++;
      }
    }

    return count > 0 ? count : maxColumns;
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
        const baseFrameWidth = sprite.frameWidth || sprite.width;
        const baseFrameHeight = sprite.frameHeight || sprite.height;
        const isEnemySprite = typeof sprite.imageName === 'string' && sprite.imageName.startsWith('enemy:');
        const gridCandidates = [4, 3, 5, 6, 8];

        let frameWidth = baseFrameWidth;
        let frameHeight = baseFrameHeight;
        let drawWidth = sprite.width;
        let drawHeight = sprite.height;

        if (isEnemySprite && spriteImage.width % 3 === 0 && spriteImage.height % 4 === 0) {
          frameWidth = spriteImage.width / 3;
          frameHeight = spriteImage.height / 4;
        } else {
          const baseFits =
            spriteImage.width % frameWidth === 0 &&
            spriteImage.height % frameHeight === 0;

          if (!baseFits && isEnemySprite) {
            for (const grid of gridCandidates) {
              if (spriteImage.width % grid === 0 && spriteImage.height % grid === 0) {
                frameWidth = spriteImage.width / grid;
                frameHeight = spriteImage.height / grid;
                break;
              }
            }
          }

          const finalFits =
            spriteImage.width % frameWidth === 0 &&
            spriteImage.height % frameHeight === 0;
          if (!finalFits) {
            frameWidth = spriteImage.width;
            frameHeight = spriteImage.height;
            drawWidth = spriteImage.width;
            drawHeight = spriteImage.height;
          }
        }
        const columns = Math.max(1, Math.floor(spriteImage.width / frameWidth));
        const maxRow = Math.max(0, Math.floor(spriteImage.height / frameHeight) - 1);
        const frameIndex = Math.max(0, Math.min(sprite.frameIndex || 0, columns - 1));
        const frameRow = Math.max(0, Math.min(sprite.frameRow || 0, maxRow));
        const sx = frameIndex * frameWidth;
        const sy = frameRow * frameHeight;

        renderer.drawImage(
          spriteImage,
          x + sprite.offsetX,
          y + sprite.offsetY,
          drawWidth,
          drawHeight,
          sx,
          sy,
          frameWidth,
          frameHeight
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
    this.colliderToEntity.clear();
    this.entitySoundConfig.clear();
    this.activePlayerCollisions.clear();
    this.enemyBehaviorConfig.clear();
    this.enemyBehaviorState.clear();
    AudioManager.stopBackground();
  }
}

