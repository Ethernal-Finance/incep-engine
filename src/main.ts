import { Game } from './engine/Game';
import { Scene } from './engine/Scene';
import { Renderer } from './engine/Renderer';

class GameScene extends Scene {
  private renderer: Renderer;

  constructor() {
    super('GameScene');
  }

  init(): void {
    // Initialize game scene
  }

  update(deltaTime: number): void {
    // Update game logic
  }

  render(renderer: Renderer): void {
    this.renderer = renderer;
    // Render game
    renderer.fillText('Game Scene', 100, 100, '#ffffff');
  }

  destroy(): void {
    // Cleanup
  }
}

// Initialize game
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas not found');
}

canvas.width = 800;
canvas.height = 600;

const game = new Game(canvas);
const scene = new GameScene();
game.setScene(scene);
game.start();

