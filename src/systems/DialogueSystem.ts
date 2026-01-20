import { EntitySystem, Entity } from './EntitySystem';
import { Dialogue } from '../components/Dialogue';
import { Input } from '../engine/Input';

export class DialogueSystem {
  private activeDialogue: Dialogue | null = null;

  constructor(private entitySystem: EntitySystem) {}

  startDialogue(entity: Entity): void {
    const dialogue = entity.getComponent<Dialogue>('dialogue');
    if (dialogue && dialogue.nodes.size > 0) {
      this.activeDialogue = dialogue;
      const firstNodeId = Array.from(dialogue.nodes.keys())[0];
      dialogue.start(firstNodeId);
    }
  }

  update(deltaTime: number): void {
    if (!this.activeDialogue || !this.activeDialogue.isActive) {
      this.activeDialogue = null;
      return;
    }

    const node = this.activeDialogue.getCurrentNode();
    if (!node) return;

    // Handle input for dialogue progression
    if (Input.getKeyDown('Enter')) {
      if (node.choices && node.choices.length > 0) {
        // Handle choice selection (simplified - would need UI)
        this.activeDialogue.selectChoice(0);
      } else {
        // Advance to next node or end
        this.activeDialogue.end();
      }
    }
  }

  getActiveDialogue(): Dialogue | null {
    return this.activeDialogue;
  }

  endDialogue(): void {
    if (this.activeDialogue) {
      this.activeDialogue.end();
      this.activeDialogue = null;
    }
  }
}

