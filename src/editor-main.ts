import { Game } from './engine/Game';
import { Editor } from './editor/Editor';
import { Scene } from './engine/Scene';
import { Renderer } from './engine/Renderer';
import { Time } from './engine/Time';
import { Input } from './engine/Input';

class EditorScene extends Scene {
  private editor: Editor;

  constructor(editor: Editor) {
    super('EditorScene');
    this.editor = editor;
  }

  async init(): Promise<void> {
    // Create a new level for editing
    this.editor.createNewLevel(50, 50, 32);
  }

  update(deltaTime: number): void {
    this.editor.update(deltaTime);
  }

  render(renderer: Renderer): void {
    this.editor.render();
  }

  destroy(): void {
    // Cleanup if needed
  }
}

const canvas = document.getElementById('editorCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new Game(canvas);
const editor = new Editor(game);
const scene = new EditorScene(editor);
game.setScene(scene);
game.start();

