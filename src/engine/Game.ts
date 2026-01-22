import { Renderer } from './Renderer';
import { Input } from './Input';
import { Time } from './Time';
import { Scene } from './Scene';

export class Game {
  private renderer: Renderer;
  private currentScene: Scene | null = null;
  private running: boolean = false;
  private paused: boolean = false;
  private animationFrameId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    Input.init(canvas);
    Time.init();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  togglePause(): void {
    this.paused = !this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  setScene(scene: Scene): void {
    if (this.currentScene) {
      this.currentScene.destroy();
    }
    this.currentScene = scene;
    scene.init();
  }

  getScene(): Scene | null {
    return this.currentScene;
  }

  getRenderer(): Renderer {
    return this.renderer;
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    Time.update();

    if (this.currentScene && !this.paused) {
      this.currentScene.update(Time.getDeltaTime());
    }

    // Always render, even when paused
    if (this.currentScene) {
      this.renderer.clear('#1a1a1a');
      this.currentScene.render(this.renderer);
    }

    // Clear per-frame input after scene update/render.
    Input.update();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };
}

