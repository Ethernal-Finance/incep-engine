import { Game } from './engine/Game';
import { GameScene } from './scenes/GameScene';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new Game(canvas);
const scene = new GameScene();

// Set up regenerate button
const regenerateButton = document.getElementById('regenerateButton') as HTMLButtonElement;
if (regenerateButton) {
  regenerateButton.addEventListener('click', async () => {
    // Get renderer from game to pass screen dimensions
    const renderer = game.getRenderer();
    await scene.regenerateWorld(renderer);
  });
}

game.setScene(scene).then(() => {
  game.start();
});

