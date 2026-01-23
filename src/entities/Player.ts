import { Entity } from '../systems/EntitySystem';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Collider, CollisionLayer } from '../components/Collider';
import { Movement } from '../components/Movement';
import { Health } from '../components/Health';
import { Inventory } from '../components/Inventory';

export class Player {
  static create(
    entitySystem: any,
    x: number,
    y: number,
    spriteName: string = 'walk',
    frameSize: number = 64
  ): Entity {
    const player = entitySystem.createEntity('Player');

    player.addComponent('transform', new Transform(x, y));
    const sprite = new Sprite(spriteName, 64, 64);
    if (frameSize > 0 && frameSize !== sprite.width) {
      sprite.frameWidth = frameSize;
      sprite.frameHeight = frameSize;
    }
    player.addComponent('sprite', sprite);
    player.addComponent(
      'collider',
      new Collider(0, 0, 28, 28, CollisionLayer.Player, false)
    );
    player.addComponent('movement', new Movement(150, 200, 600, 0.85));
    player.addComponent('health', new Health(100));
    player.addComponent('inventory', new Inventory(20));

    return player;
  }
}

