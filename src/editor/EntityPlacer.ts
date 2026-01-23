import { Level, LevelEntity } from '../data/Level';
import { Renderer } from '../engine/Renderer';
import { Input } from '../engine/Input';
import { Camera } from '../systems/CameraSystem';
import { Vector2 } from '../utils/Vector2';
import { Rect } from '../utils/Rect';

export class EntityPlacer {
  private selectedEntityType: string = 'player';
  private selectedEntity: LevelEntity | null = null;
  private hoveredEntity: LevelEntity | null = null;
  private isDragging: boolean = false;
  private dragOffset: Vector2 = new Vector2();
  private snapToGrid: boolean = true;
  private isActive: boolean = false;
  private previewPosition: Vector2 | null = null;
  private selectedEnemySprite: string | null = null;
  private selectedEnemyAI: string | null = null;
  private readonly typeSizeMultipliers: Record<string, number> = {
    player: 1,
    enemy: 1.1,
    npc: 0.85,
    item: 0.6
  };

  constructor(private level: Level) {}

  setSelectedEntityType(type: string): void {
    const trimmed = type.trim();
    this.selectedEntityType = trimmed.length > 0 ? trimmed : 'entity';
  }

  getSelectedEntityType(): string {
    return this.selectedEntityType;
  }

  applyTypeToSelectedEntity(type: string): void {
    if (!this.selectedEntity) return;
    const trimmed = type.trim();
    this.selectedEntity.type = trimmed.length > 0 ? trimmed : 'entity';
  }

  setSelectedEnemySprite(spriteName: string | null): void {
    const trimmed = spriteName?.trim() ?? '';
    this.selectedEnemySprite = trimmed.length > 0 ? trimmed : null;
  }

  getSelectedEnemySprite(): string | null {
    return this.selectedEnemySprite;
  }

  setSelectedEnemyAI(mode: string | null): void {
    const trimmed = mode?.trim() ?? '';
    this.selectedEnemyAI = trimmed.length > 0 ? trimmed : null;
  }

  getSelectedEnemyAI(): string | null {
    return this.selectedEnemyAI;
  }

  setSnapToGrid(enabled: boolean): void {
    this.snapToGrid = enabled;
  }

  getSnapToGrid(): boolean {
    return this.snapToGrid;
  }

  setActive(active: boolean): void {
    this.isActive = active;
    if (!active) {
      this.isDragging = false;
      this.hoveredEntity = null;
      this.previewPosition = null;
    }
  }

  update(_deltaTime: number, worldPos: Vector2, _camera: Camera, _zoom: number, _viewportWidth: number, _viewportHeight: number): void {
    const placementPos = this.getPlacementPosition(worldPos, this.selectedEntityType);
    this.previewPosition = placementPos;
    this.hoveredEntity = this.findEntityAt(worldPos);

    if (Input.getMouseButtonDown(0)) {
      // Check if clicking on existing entity
      const clickedEntity = this.hoveredEntity;
      if (clickedEntity) {
        const duplicated = Input.getKey('Alt') ? this.duplicateEntity(clickedEntity) : null;
        if (duplicated) {
          this.level.addEntity(duplicated);
          this.selectedEntity = duplicated;
        } else {
          this.selectedEntity = clickedEntity;
        }
        this.startDragging(worldPos);
      } else {
        // Place new entity
        const newEntity = this.createEntity(placementPos, this.selectedEntityType);
        this.level.addEntity(newEntity);
        this.selectedEntity = newEntity;
        this.startDragging(worldPos);
      }
    }

    if (this.selectedEntity && this.isDragging && Input.getMouseButton(0)) {
      const dragPos = Vector2.subtract(worldPos, this.dragOffset);
      const snapped = this.getPlacementPosition(dragPos, this.selectedEntity.type);
      this.selectedEntity.x = snapped.x;
      this.selectedEntity.y = snapped.y;
    }

    if (this.isDragging && Input.getMouseButtonUp(0)) {
      this.isDragging = false;
    }

    if ((Input.getKeyDown('Delete') || Input.getKeyDown('Backspace')) && this.selectedEntity) {
      this.level.removeEntity(this.selectedEntity.id);
      this.selectedEntity = null;
    }

    if (this.selectedEntity) {
      const nudge = new Vector2(0, 0);
      if (Input.getKeyDown('ArrowLeft')) nudge.x = -1;
      if (Input.getKeyDown('ArrowRight')) nudge.x = 1;
      if (Input.getKeyDown('ArrowUp')) nudge.y = -1;
      if (Input.getKeyDown('ArrowDown')) nudge.y = 1;

      if (nudge.x !== 0 || nudge.y !== 0) {
        const step = this.snapToGrid ? this.level.tilemap.tileSize : 1;
        const nextPos = new Vector2(
          this.selectedEntity.x + nudge.x * step,
          this.selectedEntity.y + nudge.y * step
        );
        const clamped = this.getPlacementPosition(nextPos, this.selectedEntity.type);
        this.selectedEntity.x = clamped.x;
        this.selectedEntity.y = clamped.y;
      }
    }
  }

  private findEntityAt(pos: Vector2): LevelEntity | null {
    for (let index = this.level.entities.length - 1; index >= 0; index--) {
      const entity = this.level.entities[index];
      const bounds = this.getEntityBounds(entity);
      if (bounds.containsPoint(pos)) {
        return entity;
      }
    }
    return null;
  }

  render(renderer: Renderer): void {
    for (const entity of this.level.entities) {
      const size = this.getEntitySize(entity.type);
      const color = this.getEntityColor(entity.type);
      const label = entity.type || 'entity';

      // Render entity placeholder
      renderer.fillRect(entity.x, entity.y, size.width, size.height, color.fill);
      renderer.strokeRect(entity.x, entity.y, size.width, size.height, color.stroke, 1);

      // Highlight selected entity
      if (this.selectedEntity && this.selectedEntity.id === entity.id) {
        renderer.strokeRect(entity.x - 4, entity.y - 4, size.width + 8, size.height + 8, '#ffff00', 2);
      }

      if (this.hoveredEntity && this.hoveredEntity.id === entity.id && this.selectedEntity?.id !== entity.id) {
        renderer.strokeRect(entity.x - 2, entity.y - 2, size.width + 4, size.height + 4, '#4a9eff', 1);
      }

      this.renderEntityLabel(renderer, entity.x, entity.y, size.width, label);
    }

    if (this.isActive && this.previewPosition && !this.isDragging) {
      const previewSize = this.getEntitySize(this.selectedEntityType);
      const color = this.getEntityColor(this.selectedEntityType);
      renderer.fillRect(
        this.previewPosition.x,
        this.previewPosition.y,
        previewSize.width,
        previewSize.height,
        color.preview
      );
      renderer.strokeRect(
        this.previewPosition.x,
        this.previewPosition.y,
        previewSize.width,
        previewSize.height,
        color.stroke,
        1
      );
      this.renderEntityLabel(
        renderer,
        this.previewPosition.x,
        this.previewPosition.y,
        previewSize.width,
        this.selectedEntityType
      );
    }
  }

  getSelectedEntity(): LevelEntity | null {
    return this.selectedEntity;
  }

  private createEntity(pos: Vector2, type: string): LevelEntity {
    const properties: Record<string, any> = {};
    if (type === 'enemy') {
      if (this.selectedEnemySprite) {
        properties.enemySprite = this.selectedEnemySprite;
      }
      if (this.selectedEnemyAI) {
        properties.enemyAI = this.selectedEnemyAI;
      }
    }
    const hasProperties = Object.keys(properties).length > 0;
    return {
      type,
      id: `entity_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      x: pos.x,
      y: pos.y,
      properties: hasProperties ? properties : undefined
    };
  }

  private duplicateEntity(entity: LevelEntity): LevelEntity | null {
    if (!entity) return null;
    return {
      type: entity.type,
      id: `entity_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      x: entity.x,
      y: entity.y,
      properties: entity.properties ? { ...entity.properties } : undefined
    };
  }

  private startDragging(worldPos: Vector2): void {
    if (!this.selectedEntity) return;
    this.isDragging = true;
    this.dragOffset = Vector2.subtract(worldPos, new Vector2(this.selectedEntity.x, this.selectedEntity.y));
  }

  private getEntitySize(type: string): { width: number; height: number } {
    const tileSize = this.level.tilemap.tileSize;
    const multiplier = this.typeSizeMultipliers[type] ?? 0.8;
    const size = Math.max(12, tileSize * multiplier);
    return { width: size, height: size };
  }

  private getEntityBounds(entity: LevelEntity): Rect {
    const size = this.getEntitySize(entity.type);
    return new Rect(entity.x, entity.y, size.width, size.height);
  }

  private getEntityColor(type: string): { fill: string; stroke: string; preview: string } {
    const palette: Record<string, { fill: string; stroke: string }> = {
      player: { fill: '#4a9eff', stroke: '#cfe6ff' },
      enemy: { fill: '#ff4d4d', stroke: '#ffd1d1' },
      npc: { fill: '#ffe066', stroke: '#fff1b8' },
      item: { fill: '#c77dff', stroke: '#edd7ff' }
    };

    const color = palette[type] ?? this.getHashedColor(type);
    return {
      fill: color.fill,
      stroke: color.stroke,
      preview: this.withAlpha(color.fill, 0.35)
    };
  }

  private getHashedColor(type: string): { fill: string; stroke: string } {
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
      hash = (hash << 5) - hash + type.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return {
      fill: `hsl(${hue}, 70%, 55%)`,
      stroke: `hsl(${hue}, 70%, 85%)`
    };
  }

  private withAlpha(color: string, alpha: number): string {
    if (color.startsWith('#') && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('hsl(')) {
      return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
    }
    return color;
  }

  private getPlacementPosition(pos: Vector2, type: string): Vector2 {
    const tileSize = this.level.tilemap.tileSize;
    const size = this.getEntitySize(type);
    const snapped = pos.copy();

    if (this.snapToGrid) {
      snapped.x = Math.round(snapped.x / tileSize) * tileSize;
      snapped.y = Math.round(snapped.y / tileSize) * tileSize;
    }

    const maxX = this.level.tilemap.width * tileSize - size.width;
    const maxY = this.level.tilemap.height * tileSize - size.height;
    snapped.x = Math.max(0, Math.min(maxX, snapped.x));
    snapped.y = Math.max(0, Math.min(maxY, snapped.y));

    return snapped;
  }

  private renderEntityLabel(renderer: Renderer, x: number, y: number, width: number, label: string): void {
    const ctx = renderer.getContext();
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const padding = 4;
    const text = label || 'entity';
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width + padding * 2;
    const textHeight = 16;
    const labelX = x + width / 2;
    const labelY = y - 6;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(labelX - textWidth / 2, labelY - textHeight, textWidth, textHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, labelX, labelY - 4);
    ctx.restore();
  }
}
