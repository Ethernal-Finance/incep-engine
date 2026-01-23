import { Entity } from '../systems/EntitySystem';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Collider, CollisionLayer } from '../components/Collider';
import { Dialogue } from '../components/Dialogue';

export class NPC {
  static create(
    entitySystem: any,
    x: number,
    y: number,
    name: string = 'NPC',
    spriteName: string = 'npc',
    frameSize: number = 32
  ): Entity {
    const npc = entitySystem.createEntity(name);

    npc.addComponent('transform', new Transform(x, y));
    const sprite = new Sprite(spriteName, 32, 32);
    if (frameSize > 0 && frameSize !== sprite.width) {
      sprite.frameWidth = frameSize;
      sprite.frameHeight = frameSize;
    }
    npc.addComponent('sprite', sprite);
    npc.addComponent('collider', new Collider(0, 0, 32, 32, CollisionLayer.None, true));
    npc.addComponent('dialogue', new Dialogue());

    return npc;
  }
}

