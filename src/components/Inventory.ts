import { Component } from './Component';

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'consumable' | 'key' | 'equipment' | 'other';
  quantity: number;
  data?: any;
}

export class Inventory extends Component {
  public items: Item[] = [];
  public maxSize: number = 20;
  public equippedWeapon: Item | null = null;
  public equippedArmor: Item | null = null;

  addItem(item: Item): boolean {
    if (this.items.length >= this.maxSize) {
      return false;
    }

    // Check if item already exists and is stackable
    const existingItem = this.items.find(i => i.id === item.id);
    if (existingItem && (item.type === 'consumable' || item.type === 'key')) {
      existingItem.quantity += item.quantity;
      return true;
    }

    this.items.push({ ...item });
    return true;
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    const itemIndex = this.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return false;

    const item = this.items[itemIndex];
    if (item.quantity <= quantity) {
      this.items.splice(itemIndex, 1);
      if (this.equippedWeapon?.id === itemId) {
        this.equippedWeapon = null;
      }
      if (this.equippedArmor?.id === itemId) {
        this.equippedArmor = null;
      }
    } else {
      item.quantity -= quantity;
    }
    return true;
  }

  hasItem(itemId: string, quantity: number = 1): boolean {
    const item = this.items.find(i => i.id === itemId);
    return item ? item.quantity >= quantity : false;
  }

  getItem(itemId: string): Item | undefined {
    return this.items.find(i => i.id === itemId);
  }

  equipWeapon(itemId: string): boolean {
    const item = this.getItem(itemId);
    if (item && item.type === 'weapon') {
      this.equippedWeapon = item;
      return true;
    }
    return false;
  }

  equipArmor(itemId: string): boolean {
    const item = this.getItem(itemId);
    if (item && item.type === 'equipment') {
      this.equippedArmor = item;
      return true;
    }
    return false;
  }

  clone(): Inventory {
    const inventory = new Inventory();
    inventory.items = this.items.map(item => ({ ...item }));
    inventory.maxSize = this.maxSize;
    inventory.equippedWeapon = this.equippedWeapon ? { ...this.equippedWeapon } : null;
    inventory.equippedArmor = this.equippedArmor ? { ...this.equippedArmor } : null;
    return inventory;
  }
}

