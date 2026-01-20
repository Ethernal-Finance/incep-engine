import { Entity } from './Entity';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Collider, CollisionLayer } from '../components/Collider';
import { Dialogue, DialogueNode } from '../components/Dialogue';
import { AssetLoader } from '../engine/AssetLoader';

export class NPC extends Entity {
  constructor(x: number = 0, y: number = 0, name: string = 'NPC') {
    super(name);
    
    this.addComponent(new Transform(x, y));
    
    const sprite = this.addComponent(new Sprite());
    sprite.width = 32;
    sprite.height = 32;
    sprite.offsetX = -16;
    sprite.offsetY = -16;
    
    const collider = this.addComponent(new Collider(24, 24, -12, -12));
    collider.layer = CollisionLayer.NPC;
    collider.isTrigger = true;
    
    this.addComponent(new Dialogue());
  }

  setDialogue(dialogueNodes: DialogueNode[]): void {
    const dialogue = this.getComponent(Dialogue);
    if (dialogue) {
      dialogue.setDialogueTree(dialogueNodes);
    }
  }

  static async createWithSprite(x: number, y: number, spritePath: string, name: string = 'NPC'): Promise<NPC> {
    const npc = new NPC(x, y, name);
    const sprite = npc.getComponent(Sprite)!;
    
    await AssetLoader.loadImage(spritePath);
    sprite.image = AssetLoader.getImage(spritePath);
    sprite.imagePath = spritePath;
    
    return npc;
  }
}

