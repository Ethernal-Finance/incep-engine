import { EntitySystem, Entity } from './EntitySystem';
import { Inventory } from '../components/Inventory';

export class InventorySystem {
  constructor(private entitySystem: EntitySystem) {}

  addItem(entity: Entity, item: any): boolean {
    const inventory = entity.getComponent<Inventory>('inventory');
    if (!inventory) return false;
    return inventory.addItem(item);
  }

  removeItem(entity: Entity, itemId: string, quantity: number = 1): boolean {
    const inventory = entity.getComponent<Inventory>('inventory');
    if (!inventory) return false;
    return inventory.removeItem(itemId, quantity);
  }

  hasItem(entity: Entity, itemId: string, quantity: number = 1): boolean {
    const inventory = entity.getComponent<Inventory>('inventory');
    if (!inventory) return false;
    return inventory.hasItem(itemId, quantity);
  }
}

