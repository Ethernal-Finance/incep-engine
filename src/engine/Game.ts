import { Time } from './Time';
import { Input } from './Input';
import { Renderer } from './Renderer';
import { Scene } from './Scene';

export class Game {
  private renderer: Renderer;
  private currentScene: Scene | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    Input.init(canvas);
    Time.init();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  async setScene(scene: Scene): Promise<void> {
    if (this.currentScene) {
      this.currentScene.destroy();
    }
    this.currentScene = scene;
    await scene.init();
  }

  getScene(): Scene | null {
    return this.currentScene;
  }

  getRenderer(): Renderer {
    return this.renderer;
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    Time.update();
    Input.update();

    if (this.currentScene) {
      this.currentScene.update(Time.getDeltaTime());
      this.renderer.clear('#1a1a2e');
      this.currentScene.render(this.renderer);
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };
}

