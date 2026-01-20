import { EntityManager } from '../entities/EntityManager';
import { Entity } from '../entities/Entity';
import { Inventory } from '../components/Inventory';
import { Item as ItemEntity } from '../entities/Item';
import { Collider } from '../components/Collider';
import { Transform } from '../components/Transform';
import { Input } from '../engine/Input';

export class InventorySystem {
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  update(deltaTime: number): void {
    // Check for item pickup (player colliding with items)
    const players = this.entityManager.getEntitiesWithComponent(Inventory);
    const items = this.entityManager.getEntitiesWithComponent(Collider)
      .filter(e => e instanceof ItemEntity);

    for (const player of players) {
      const inventory = player.getComponent(Inventory)!;
      const playerCollider = player.getComponent(Collider);

      if (!playerCollider) continue;

      for (const itemEntity of items) {
        if (!itemEntity.enabled) continue;

        const itemCollider = itemEntity.getComponent(Collider);
        if (!itemCollider || !itemCollider.isTrigger) continue;

        // Simple collision check (could use CollisionSystem)
        const playerTransform = player.getComponent(Transform);
        const itemTransform = itemEntity.getComponent(Transform);
        
        if (playerTransform && itemTransform) {
          const distance = playerTransform.position.distance(itemTransform.position);
          if (distance < 32) { // Pickup radius
            const item = (itemEntity as ItemEntity);
            if (inventory.addItem(item.itemData)) {
              itemEntity.enabled = false;
              this.entityManager.remove(itemEntity.id);
            }
          }
        }
      }
    }
  }

  useItem(player: Entity, itemId: string): boolean {
    const inventory = player.getComponent(Inventory);
    if (!inventory) return false;

    const item = inventory.getItem(itemId);
    if (!item) return false;

    switch (item.type) {
      case 'consumable':
        // Apply consumable effect (heal, etc.)
        const health = player.getComponent(require('../components/Health').Health);
        if (health && item.data?.healAmount) {
          health.heal(item.data.healAmount);
        }
        inventory.removeItem(itemId, 1);
        return true;

      case 'weapon':
        inventory.equipWeapon(itemId);
        return true;

      case 'equipment':
        inventory.equipArmor(itemId);
        return true;

      default:
        return false;
    }
  }
}

