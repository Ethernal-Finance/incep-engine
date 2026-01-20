import { EntityManager } from '../entities/EntityManager';
import { Entity } from '../entities/Entity';
import { Sprite } from '../components/Sprite';
import { Transform } from '../components/Transform';
import { Renderer } from '../engine/Renderer';
import { Vector2 } from '../utils/Vector2';

export class EntitySystem {
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  update(deltaTime: number): void {
    // Update sprite animations
    const entitiesWithSprites = this.entityManager.getEntitiesWithComponent(Sprite);
    for (const entity of entitiesWithSprites) {
      const sprite = entity.getComponent(Sprite)!;
      if (sprite.enabled) {
        sprite.updateAnimation(deltaTime);
      }
    }
  }

  render(renderer: Renderer): void {
    const entities = this.entityManager.getAll();
    
    // Sort by y position for proper z-ordering
    const sortedEntities = entities
      .filter(e => e.enabled)
      .filter(e => e.hasComponent(Sprite) && e.hasComponent(Transform))
      .sort((a, b) => {
        const transformA = a.getComponent(Transform)!;
        const transformB = b.getComponent(Transform)!;
        return transformA.position.y - transformB.position.y;
      });

    for (const entity of sortedEntities) {
      const sprite = entity.getComponent(Sprite);
      const transform = entity.getComponent(Transform);
      
      if (!sprite || !transform || !sprite.enabled) continue;

      const screenPos = renderer.worldToScreen(transform.position);
      const zoom = renderer.getCameraZoom();

      renderer.save();
      renderer.getContext().globalAlpha = sprite.opacity;

      // Handle flip
      if (sprite.flipX || sprite.flipY) {
        renderer.translate(screenPos.x, screenPos.y);
        renderer.scale(sprite.flipX ? -1 : 1, sprite.flipY ? -1 : 1);
        renderer.translate(-screenPos.x, -screenPos.y);
      }

      // Get current animation frame or use full image
      const frame = sprite.getCurrentFrame();
      
      if (sprite.image) {
        if (frame) {
          // Draw from animation frame
          renderer.drawImage(
            sprite.image,
            screenPos.x + sprite.offsetX * zoom,
            screenPos.y + sprite.offsetY * zoom,
            (frame.width || sprite.width) * zoom,
            (frame.height || sprite.height) * zoom,
            frame.x,
            frame.y,
            frame.width,
            frame.height
          );
        } else {
          // Draw full image
          renderer.drawImage(
            sprite.image,
            screenPos.x + sprite.offsetX * zoom,
            screenPos.y + sprite.offsetY * zoom,
            sprite.width * zoom,
            sprite.height * zoom
          );
        }

        // Apply tint if set
        if (sprite.tint) {
          renderer.save();
          renderer.getContext().globalCompositeOperation = 'multiply';
          renderer.fillRect(
            screenPos.x + sprite.offsetX * zoom,
            screenPos.y + sprite.offsetY * zoom,
            sprite.width * zoom,
            sprite.height * zoom,
            sprite.tint
          );
          renderer.restore();
        }
      } else {
        // Draw placeholder rectangle if no image
        const color = sprite.tint || this.getEntityColor(entity);
        renderer.fillRect(
          screenPos.x + sprite.offsetX * zoom,
          screenPos.y + sprite.offsetY * zoom,
          sprite.width * zoom,
          sprite.height * zoom,
          color
        );
        // Draw border
        renderer.strokeRect(
          screenPos.x + sprite.offsetX * zoom,
          screenPos.y + sprite.offsetY * zoom,
          sprite.width * zoom,
          sprite.height * zoom,
          '#ffffff',
          1
        );
      }

      renderer.restore();
    }
  }

  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  private getEntityColor(entity: Entity): string {
    // Return different colors based on entity type/name
    const name = entity.name.toLowerCase();
    if (name.includes('player')) return '#00aaff';
    if (name.includes('npc')) return '#00ff00';
    if (name.includes('enemy')) return '#ff0000';
    if (name.includes('item')) return '#ffff00';
    return '#6666ff'; // Default color
  }
}

