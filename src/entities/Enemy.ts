import { Entity } from './Entity';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Collider, CollisionLayer } from '../components/Collider';
import { Movement } from '../components/Movement';
import { Health } from '../components/Health';
import { AssetLoader } from '../engine/AssetLoader';

export class Enemy extends Entity {
  constructor(x: number = 0, y: number = 0, name: string = 'Enemy') {
    super(name);
    
    this.addComponent(new Transform(x, y));
    
    const sprite = this.addComponent(new Sprite());
    sprite.width = 32;
    sprite.height = 32;
    sprite.offsetX = -16;
    sprite.offsetY = -16;
    
    const collider = this.addComponent(new Collider(24, 24, -12, -12));
    collider.layer = CollisionLayer.Enemy;
    
    const movement = this.addComponent(new Movement());
    movement.speed = 80;
    movement.maxSpeed = 80;
    
    const health = this.addComponent(new Health());
    health.maxHealth = 50;
    health.currentHealth = 50;
  }

  static async createWithSprite(x: number, y: number, spritePath: string, name: string = 'Enemy'): Promise<Enemy> {
    const enemy = new Enemy(x, y, name);
    const sprite = enemy.getComponent(Sprite)!;
    
    await AssetLoader.loadImage(spritePath);
    sprite.image = AssetLoader.getImage(spritePath);
    sprite.imagePath = spritePath;
    
    return enemy;
  }
}

