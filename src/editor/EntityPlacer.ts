import { Editor, EditorTool } from './Editor';
import { Renderer } from '../engine/Renderer';
import { Input } from '../engine/Input';
import { Vector2 } from '../utils/Vector2';
import { EntityManager } from '../entities/EntityManager';
import { Entity } from '../entities/Entity';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';

export class EntityPlacer {
  private editor: Editor;
  private entityManager: EntityManager;
  private selectedEntity: Entity | null = null;
  private isDragging: boolean = false;
  private dragOffset: Vector2 = Vector2.zero();

  constructor(editor: Editor) {
    this.editor = editor;
    this.entityManager = new EntityManager();
  }

  update(deltaTime: number): void {
    if (this.editor.getTool() !== EditorTool.Entity) return;

    const renderer = this.editor.getRenderer();
    const mousePos = Input.getMousePosition();
    const worldPos = renderer.screenToWorld(mousePos);

    // Handle entity selection
    if (Input.getMouseButtonDown(0)) {
      const clickedEntity = this.getEntityAtPosition(worldPos);
      if (clickedEntity) {
        this.setSelectedEntity(clickedEntity);
        const transform = clickedEntity.getComponent(Transform);
        if (transform) {
          this.dragOffset = worldPos.subtract(transform.position);
          this.isDragging = true;
        }
      } else {
        this.setSelectedEntity(null);
      }
    }

    // Handle entity dragging
    if (this.isDragging && this.selectedEntity) {
      const transform = this.selectedEntity.getComponent(Transform);
      if (transform) {
        transform.position = worldPos.subtract(this.dragOffset);
      }
    }

    if (Input.getMouseButtonUp(0)) {
      this.isDragging = false;
    }

    // Handle entity deletion
    if (this.selectedEntity && Input.getKeyDown('Delete')) {
      this.entityManager.remove(this.selectedEntity.id);
      this.setSelectedEntity(null);
    }
  }

  private getEntityAtPosition(position: Vector2): Entity | null {
    const entities = this.entityManager.getAll();
    
    for (const entity of entities) {
      const transform = entity.getComponent(Transform);
      const sprite = entity.getComponent(Sprite);
      
      if (!transform || !sprite) continue;

      const distance = transform.position.distance(position);
      const radius = Math.max(sprite.width, sprite.height) / 2;
      
      if (distance <= radius) {
        return entity;
      }
    }

    return null;
  }

  createEntity(type: string, x: number, y: number): Entity {
    const entity = this.entityManager.create(type);
    const transform = entity.addComponent(new Transform(x, y));
    const sprite = entity.addComponent(new Sprite());
    sprite.width = 32;
    sprite.height = 32;
    sprite.offsetX = -16;
    sprite.offsetY = -16;
    
    return entity;
  }

  render(renderer: Renderer): void {
    // Render all entities
    const entities = this.entityManager.getAll();
    for (const entity of entities) {
      const transform = entity.getComponent(Transform);
      const sprite = entity.getComponent(Sprite);
      
      if (!transform || !sprite) continue;

      const screenPos = renderer.worldToScreen(transform.position);
      
      // Draw entity bounds
      renderer.strokeRect(
        screenPos.x + sprite.offsetX * renderer.getCameraZoom(),
        screenPos.y + sprite.offsetY * renderer.getCameraZoom(),
        sprite.width * renderer.getCameraZoom(),
        sprite.height * renderer.getCameraZoom(),
        entity === this.selectedEntity ? '#00ff00' : '#00aaff',
        2
      );

      // Draw sprite if available
      if (sprite.image) {
        renderer.drawImage(
          sprite.image,
          screenPos.x + sprite.offsetX * renderer.getCameraZoom(),
          screenPos.y + sprite.offsetY * renderer.getCameraZoom(),
          sprite.width * renderer.getCameraZoom(),
          sprite.height * renderer.getCameraZoom()
        );
      } else {
        // Draw placeholder
        renderer.fillRect(
          screenPos.x + sprite.offsetX * renderer.getCameraZoom(),
          screenPos.y + sprite.offsetY * renderer.getCameraZoom(),
          sprite.width * renderer.getCameraZoom(),
          sprite.height * renderer.getCameraZoom(),
          '#6666ff'
        );
      }
    }
  }

  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  getSelectedEntity(): Entity | null {
    return this.selectedEntity;
  }

  setSelectedEntity(entity: Entity | null): void {
    this.selectedEntity = entity;
    this.editor.getPropertyInspector()?.setSelectedEntity(entity);
  }
}

