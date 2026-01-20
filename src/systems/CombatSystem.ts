import { EntitySystem, Entity } from './EntitySystem';
import { Health } from '../components/Health';
import { Transform } from '../components/Transform';
import { Vector2 } from '../utils/Vector2';

export class CombatSystem {
  constructor(private entitySystem: EntitySystem) {}

  damageEntity(entity: Entity, amount: number): void {
    const health = entity.getComponent<Health>('health');
    if (health) {
      health.damage(amount);
    }
  }

  healEntity(entity: Entity, amount: number): void {
    const health = entity.getComponent<Health>('health');
    if (health) {
      health.heal(amount);
    }
  }

  attack(source: Entity, target: Entity, damage: number): void {
    const sourceTransform = source.getComponent<Transform>('transform');
    const targetTransform = target.getComponent<Transform>('transform');

    if (!sourceTransform || !targetTransform) return;

    // Check range (could be configurable)
    const distance = Vector2.distance(sourceTransform.position, targetTransform.position);
    if (distance > 50) return; // Attack range

    this.damageEntity(target, damage);
  }

  update(deltaTime: number): void {
    // Handle combat logic, cooldowns, etc.
  }
}

