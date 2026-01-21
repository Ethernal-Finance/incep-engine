import { EntitySystem, Entity } from './EntitySystem';
import { Collider } from '../components/Collider';
import { Transform } from '../components/Transform';

export class CollisionSystem {
  constructor(private entitySystem: EntitySystem) {}

  update(_deltaTime: number): void {
    const entities = this.entitySystem.getEntitiesWithComponent('collider');
    const colliders: Array<{ entity: Entity; collider: Collider; transform: Transform }> = [];

    // Collect all colliders with transforms
    for (const entity of entities) {
      const collider = entity.getComponent<Collider>('collider');
      const transform = entity.getComponent<Transform>('transform');
      if (collider && transform) {
        // Update collider position from transform
        collider.setPosition(transform.position.x, transform.position.y);
        colliders.push({ entity, collider, transform });
      }
    }

    // Check collisions
    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const a = colliders[i];
        const b = colliders[j];

        if (this.checkCollision(a.collider, b.collider)) {
          if (a.collider.onCollision) {
            a.collider.onCollision(b.collider);
          }
          if (b.collider.onCollision) {
            b.collider.onCollision(a.collider);
          }
        }
      }
    }
  }

  checkCollision(a: Collider, b: Collider): boolean {
    // Check if layers can collide
    if ((a.layer & b.layer) === 0) return false;

    return a.bounds.intersects(b.bounds);
  }

  checkTileCollision(_collider: Collider, _tilemap: any, _tileSize: number): boolean {
    // This would check against tilemap collision data
    // Implementation depends on tilemap structure
    return false;
  }
}

