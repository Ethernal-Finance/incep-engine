export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'consumable' | 'key' | 'equipment';
  quantity: number;
  data?: any;
}

export class Inventory {
  public items: Item[];
  public maxSize: number;
  public equippedWeapon: Item | null = null;
  public equippedArmor: Item | null = null;

  constructor(maxSize: number = 20) {
    this.items = [];
    this.maxSize = maxSize;
  }

  addItem(item: Item): boolean {
    if (this.items.length >= this.maxSize) {
      return false;
    }
    this.items.push(item);
    return true;
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    const index = this.items.findIndex((item) => item.id === itemId);
    if (index === -1) return false;

    const item = this.items[index];
    if (item.quantity <= quantity) {
      this.items.splice(index, 1);
    } else {
      item.quantity -= quantity;
    }
    return true;
  }

  getItem(itemId: string): Item | null {
    return this.items.find((item) => item.id === itemId) || null;
  }

  hasItem(itemId: string, quantity: number = 1): boolean {
    const item = this.getItem(itemId);
    return item !== null && item.quantity >= quantity;
  }
}

