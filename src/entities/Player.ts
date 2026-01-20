import { Entity } from './Entity';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Collider, CollisionLayer } from '../components/Collider';
import { Movement } from '../components/Movement';
import { Health } from '../components/Health';
import { Inventory } from '../components/Inventory';
import { AssetLoader } from '../engine/AssetLoader';

export class Player extends Entity {
  constructor(x: number = 0, y: number = 0) {
    super('Player');
    
    this.addComponent(new Transform(x, y));
    
    const sprite = this.addComponent(new Sprite());
    sprite.width = 32;
    sprite.height = 32;
    sprite.offsetX = -16;
    sprite.offsetY = -16;
    
    const collider = this.addComponent(new Collider(24, 24, -12, -12));
    collider.layer = CollisionLayer.Player;
    
    const movement = this.addComponent(new Movement());
    movement.speed = 150;
    movement.maxSpeed = 150;
    
    this.addComponent(new Health());
    this.addComponent(new Inventory());
  }

  static async createWithSprite(x: number, y: number, spritePath: string): Promise<Player> {
    const player = new Player(x, y);
    const sprite = player.getComponent(Sprite)!;
    
    await AssetLoader.loadImage(spritePath);
    sprite.image = AssetLoader.getImage(spritePath);
    sprite.imagePath = spritePath;
    
    return player;
  }
}

