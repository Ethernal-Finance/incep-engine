export abstract class Scene {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  abstract init(): void;
  abstract update(deltaTime: number): void;
  abstract render(renderer: any): void;
  abstract destroy(): void;
}

