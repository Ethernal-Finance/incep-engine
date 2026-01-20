export interface DialogueNode {
  id: string;
  text: string;
  speaker?: string;
  choices?: DialogueChoice[];
  onComplete?: () => void;
}

export interface DialogueChoice {
  text: string;
  nextNodeId: string;
  condition?: () => boolean;
  onSelect?: () => void;
}

export class Dialogue {
  public nodes: Map<string, DialogueNode>;
  public currentNodeId: string | null = null;
  public isActive: boolean = false;
  public onDialogueEnd?: () => void;

  constructor() {
    this.nodes = new Map();
  }

  addNode(node: DialogueNode): void {
    this.nodes.set(node.id, node);
  }

  start(nodeId: string): void {
    if (this.nodes.has(nodeId)) {
      this.currentNodeId = nodeId;
      this.isActive = true;
    }
  }

  getCurrentNode(): DialogueNode | null {
    if (!this.currentNodeId) return null;
    return this.nodes.get(this.currentNodeId) || null;
  }

  selectChoice(choiceIndex: number): void {
    const node = this.getCurrentNode();
    if (!node || !node.choices || choiceIndex >= node.choices.length) return;

    const choice = node.choices[choiceIndex];
    if (choice.condition && !choice.condition()) return;

    if (choice.onSelect) {
      choice.onSelect();
    }

    if (choice.nextNodeId) {
      this.start(choice.nextNodeId);
    } else {
      this.end();
    }
  }

  end(): void {
    this.isActive = false;
    this.currentNodeId = null;
    if (this.onDialogueEnd) {
      this.onDialogueEnd();
    }
  }
}

