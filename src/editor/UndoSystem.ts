import { PaintStroke } from './PaintingTools';

export interface UndoAction {
  type: 'paint' | 'erase' | 'collision' | 'entity' | 'layer';
  data: any;
}

export class UndoSystem {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxHistorySize: number = 100;

  constructor() {}

  pushAction(action: UndoAction): void {
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack when new action is pushed
    
    // Limit history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  pushPaintStroke(stroke: PaintStroke, apply: (stroke: PaintStroke) => void, revert: (stroke: PaintStroke) => void): void {
    const action: UndoAction = {
      type: 'paint',
      data: {
        stroke: { ...stroke, changes: [...stroke.changes] },
        apply,
        revert
      }
    };
    
    this.pushAction(action);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    
    const action = this.undoStack.pop()!;
    
    // Revert the action
    if (action.type === 'paint') {
      action.data.revert(action.data.stroke);
    } else if (action.type === 'erase') {
      // Similar pattern for other action types
      if (action.data.revert) {
        action.data.revert(action.data.stroke);
      }
    } else if (action.type === 'collision') {
      if (action.data.revert) {
        action.data.revert(action.data.changes);
      }
    } else if (action.type === 'entity') {
      if (action.data.revert) {
        action.data.revert(action.data.entity);
      }
    }
    
    // Move to redo stack
    this.redoStack.push(action);
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    
    const action = this.redoStack.pop()!;
    
    // Apply the action
    if (action.type === 'paint') {
      action.data.apply(action.data.stroke);
    } else if (action.type === 'erase') {
      if (action.data.apply) {
        action.data.apply(action.data.stroke);
      }
    } else if (action.type === 'collision') {
      if (action.data.apply) {
        action.data.apply(action.data.changes);
      }
    } else if (action.type === 'entity') {
      if (action.data.apply) {
        action.data.apply(action.data.entity);
      }
    }
    
    // Move back to undo stack
    this.undoStack.push(action);
    return true;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getHistorySize(): number {
    return this.undoStack.length;
  }
}

