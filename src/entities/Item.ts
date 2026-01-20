import { Entity } from './Entity';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Collider, CollisionLayer } from '../components/Collider';
import { AssetLoader } from '../engine/AssetLoader';

export interface ItemData {
  id: string;
  name: string;
  type: 'weapon' | 'consumable' | 'key' | 'equipment' | 'other';
  quantity?: number;
  data?: any;
}

export class Item extends Entity {
  public itemData: ItemData;

  constructor(x: number = 0, y: number = 0, itemData: ItemData) {
    super(itemData.name);
    
    this.itemData = itemData;
    
    this.addComponent(new Transform(x, y));
    
    const sprite = this.addComponent(new Sprite());
    sprite.width = 16;
    sprite.height = 16;
    sprite.offsetX = -8;
    sprite.offsetY = -8;
    
    const collider = this.addComponent(new Collider(16, 16, -8, -8));
    collider.layer = CollisionLayer.Item;
    collider.isTrigger = true;
  }

  static async createWithSprite(x: number, y: number, itemData: ItemData, spritePath: string): Promise<Item> {
    const item = new Item(x, y, itemData);
    const sprite = item.getComponent(Sprite)!;
    
    await AssetLoader.loadImage(spritePath);
    sprite.image = AssetLoader.getImage(spritePath);
    sprite.imagePath = spritePath;
    
    return item;
  }
}

