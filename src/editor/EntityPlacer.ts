import { Level, LevelEntity } from '../data/Level';
import { Renderer } from '../engine/Renderer';
import { Input } from '../engine/Input';
import { Camera } from '../systems/CameraSystem';
import { Vector2 } from '../utils/Vector2';

export class EntityPlacer {
  private selectedEntityType: string = 'player';
  private selectedEntity: LevelEntity | null = null;

  constructor(private level: Level) {}

  setSelectedEntityType(type: string): void {
    this.selectedEntityType = type;
  }

  getSelectedEntityType(): string {
    return this.selectedEntityType;
  }

  update(_deltaTime: number, mousePos: Vector2, camera: Camera, _zoom: number, viewportWidth: number, viewportHeight: number): void {
    const worldPos = camera.screenToWorld(mousePos, viewportWidth, viewportHeight);

    if (Input.getMouseButtonDown(0)) {
      // Check if clicking on existing entity
      const clickedEntity = this.findEntityAt(worldPos);
      if (clickedEntity) {
        this.selectedEntity = clickedEntity;
      } else {
        // Place new entity
        const newEntity: LevelEntity = {
          type: this.selectedEntityType,
          id: `entity_${Date.now()}`,
          x: worldPos.x,
          y: worldPos.y
        };
        this.level.addEntity(newEntity);
        this.selectedEntity = newEntity;
      }
    }

    if (Input.getKeyDown('Delete') && this.selectedEntity) {
      this.level.removeEntity(this.selectedEntity.id);
      this.selectedEntity = null;
    }
  }

  private findEntityAt(pos: Vector2): LevelEntity | null {
    for (const entity of this.level.entities) {
      const distance = Vector2.distance(new Vector2(entity.x, entity.y), pos);
      if (distance < 16) {
        return entity;
      }
    }
    return null;
  }

  render(renderer: Renderer): void {
    for (const entity of this.level.entities) {
      // Render entity placeholder
      renderer.fillRect(entity.x - 8, entity.y - 8, 16, 16, '#00ff00');
      renderer.strokeRect(entity.x - 8, entity.y - 8, 16, 16, '#ffffff', 1);

      // Highlight selected entity
      if (this.selectedEntity && this.selectedEntity.id === entity.id) {
        renderer.strokeRect(entity.x - 12, entity.y - 12, 24, 24, '#ffff00', 2);
      }
    }
  }

  getSelectedEntity(): LevelEntity | null {
    return this.selectedEntity;
  }
}

