import { EntityManager } from '../entities/EntityManager';
import { Entity } from '../entities/Entity';
import { Transform } from '../components/Transform';
import { Movement } from '../components/Movement';
import { Vector2 } from '../utils/Vector2';
import { Input } from '../engine/Input';

export class MovementSystem {
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  update(deltaTime: number): void {
    const entities = this.entityManager.getEntitiesWithComponent(Movement);

    for (const entity of entities) {
      if (!entity.enabled) continue;

      const transform = entity.getComponent(Transform);
      const movement = entity.getComponent(Movement);
      
      if (!transform || !movement || !movement.enabled) continue;

      // Update velocity based on direction
      if (movement.direction.magnitude() > 0) {
        const normalizedDir = movement.direction.normalize();
        movement.velocity = movement.velocity.add(
          normalizedDir.multiply(movement.acceleration * deltaTime)
        );
        
        // Clamp to max speed
        if (movement.velocity.magnitude() > movement.maxSpeed) {
          movement.velocity = movement.velocity.normalize().multiply(movement.maxSpeed);
        }
      } else {
        // Apply friction
        movement.velocity = movement.velocity.multiply(movement.friction);
        if (movement.velocity.magnitude() < 0.1) {
          movement.velocity = Vector2.zero();
        }
      }

      // Update position
      transform.position = transform.position.add(movement.velocity.multiply(deltaTime));
    }
  }

  handlePlayerInput(player: Entity): void {
    const movement = player.getComponent(Movement);
    if (!movement) return;

    const wasd = Input.getWASD();
    const arrows = {
      up: Input.getArrowUp(),
      down: Input.getArrowDown(),
      left: Input.getArrowLeft(),
      right: Input.getArrowRight()
    };

    // Calculate direction from input
    let dirX = 0;
    let dirY = 0;

    if (wasd.d || arrows.right) dirX += 1;
    if (wasd.a || arrows.left) dirX -= 1;
    if (wasd.w || arrows.up) dirY -= 1;
    if (wasd.s || arrows.down) dirY += 1;

    movement.direction = new Vector2(dirX, dirY);
  }
}

