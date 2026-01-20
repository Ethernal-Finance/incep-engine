import { EntitySystem, Entity } from './EntitySystem';
import { Movement } from '../components/Movement';
import { Transform } from '../components/Transform';
import { Vector2 } from '../utils/Vector2';
import { MathUtils } from '../utils/Math';

export class MovementSystem {
  constructor(private entitySystem: EntitySystem) {}

  update(deltaTime: number): void {
    const entities = this.entitySystem.getEntitiesWithComponent('movement');

    for (const entity of entities) {
      const movement = entity.getComponent<Movement>('movement');
      const transform = entity.getComponent<Transform>('transform');

      if (!movement || !transform) continue;

      // Apply friction
      movement.velocity.multiply(Math.pow(movement.friction, deltaTime * 60));

      // Clamp velocity to max speed
      const speed = movement.velocity.magnitude();
      if (speed > movement.maxSpeed) {
        movement.velocity.normalize().multiply(movement.maxSpeed);
      }

      // Update position
      const delta = Vector2.multiply(movement.velocity, deltaTime);
      transform.position.add(delta);
    }
  }

  moveEntity(entity: Entity, direction: Vector2, deltaTime: number): void {
    const movement = entity.getComponent<Movement>('movement');
    if (!movement) return;

    const normalized = Vector2.normalize(direction);
    const acceleration = Vector2.multiply(normalized, movement.acceleration * deltaTime);
    movement.velocity.add(acceleration);
  }
}

