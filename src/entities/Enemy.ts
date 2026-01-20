import { Entity } from '../systems/EntitySystem';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Collider, CollisionLayer } from '../components/Collider';
import { Movement } from '../components/Movement';
import { Health } from '../components/Health';

export class Enemy {
  static create(
    entitySystem: any,
    x: number,
    y: number,
    name: string = 'Enemy',
    health: number = 50
  ): Entity {
    const enemy = entitySystem.createEntity(name);

    enemy.addComponent('transform', new Transform(x, y));
    enemy.addComponent('sprite', new Sprite('enemy', 32, 32));
    enemy.addComponent('collider', new Collider(0, 0, 28, 28, CollisionLayer.Enemy, false));
    enemy.addComponent('movement', new Movement(80, 120, 400, 0.9));
    enemy.addComponent('health', new Health(health));

    return enemy;
  }
}

