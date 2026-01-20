import { Component } from './Component';

export interface DialogueChoice {
  text: string;
  nextDialogue?: string;
  action?: () => void;
}

export interface DialogueNode {
  id: string;
  speaker?: string;
  text: string;
  choices?: DialogueChoice[];
  nextDialogue?: string;
  action?: () => void;
}

export class Dialogue extends Component {
  public dialogueTree: Map<string, DialogueNode> = new Map();
  public currentDialogueId: string = '';
  public isActive: boolean = false;
  public onDialogueStart?: () => void;
  public onDialogueEnd?: () => void;

  setDialogueTree(nodes: DialogueNode[]): void {
    this.dialogueTree.clear();
    nodes.forEach(node => {
      this.dialogueTree.set(node.id, node);
    });
  }

  startDialogue(dialogueId: string): void {
    if (this.dialogueTree.has(dialogueId)) {
      this.currentDialogueId = dialogueId;
      this.isActive = true;
      if (this.onDialogueStart) {
        this.onDialogueStart();
      }
    }
  }

  getCurrentDialogue(): DialogueNode | null {
    return this.dialogueTree.get(this.currentDialogueId) || null;
  }

  selectChoice(choiceIndex: number): void {
    const current = this.getCurrentDialogue();
    if (!current || !current.choices) return;

    const choice = current.choices[choiceIndex];
    if (!choice) return;

    if (choice.action) {
      choice.action();
    }

    if (choice.nextDialogue) {
      this.startDialogue(choice.nextDialogue);
    } else if (current.nextDialogue) {
      this.startDialogue(current.nextDialogue);
    } else {
      this.endDialogue();
    }
  }

  next(): void {
    const current = this.getCurrentDialogue();
    if (!current) {
      this.endDialogue();
      return;
    }

    if (current.choices && current.choices.length > 0) {
      // Wait for choice selection
      return;
    }

    if (current.action) {
      current.action();
    }

    if (current.nextDialogue) {
      this.startDialogue(current.nextDialogue);
    } else {
      this.endDialogue();
    }
  }

  endDialogue(): void {
    this.isActive = false;
    this.currentDialogueId = '';
    if (this.onDialogueEnd) {
      this.onDialogueEnd();
    }
  }

  clone(): Dialogue {
    const dialogue = new Dialogue();
    dialogue.dialogueTree = new Map(this.dialogueTree);
    dialogue.currentDialogueId = this.currentDialogueId;
    dialogue.isActive = this.isActive;
    return dialogue;
  }
}

