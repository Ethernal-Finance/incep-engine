import { Entity } from '../systems/EntitySystem';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Collider, CollisionLayer } from '../components/Collider';

export class Item {
  static create(
    entitySystem: any,
    x: number,
    y: number,
    itemType: string = 'item',
    name: string = 'Item'
  ): Entity {
    const item = entitySystem.createEntity(name);

    item.addComponent('transform', new Transform(x, y));
    item.addComponent('sprite', new Sprite(itemType, 16, 16));
    item.addComponent('collider', new Collider(0, 0, 16, 16, CollisionLayer.Item, true));

    return item;
  }
}

