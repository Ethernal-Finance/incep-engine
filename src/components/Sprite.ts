import { Component } from './Component';

export interface AnimationFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number; // in seconds
}

export interface Animation {
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
}

export class Sprite extends Component {
  public imagePath: string = '';
  public image: HTMLImageElement | null = null;
  public width: number = 0;
  public height: number = 0;
  public offsetX: number = 0;
  public offsetY: number = 0;
  public flipX: boolean = false;
  public flipY: boolean = false;
  public opacity: number = 1;
  public tint: string = '';

  // Animation properties
  public animations: Map<string, Animation> = new Map();
  public currentAnimation: string = '';
  public currentFrameIndex: number = 0;
  public animationTimer: number = 0;
  public playing: boolean = false;

  setAnimation(name: string, play: boolean = true): void {
    if (this.animations.has(name)) {
      this.currentAnimation = name;
      this.currentFrameIndex = 0;
      this.animationTimer = 0;
      this.playing = play;
    }
  }

  updateAnimation(deltaTime: number): void {
    if (!this.playing || !this.currentAnimation) return;

    const animation = this.animations.get(this.currentAnimation);
    if (!animation) return;

    this.animationTimer += deltaTime;
    const currentFrame = animation.frames[this.currentFrameIndex];

    if (this.animationTimer >= currentFrame.duration) {
      this.animationTimer = 0;
      this.currentFrameIndex++;

      if (this.currentFrameIndex >= animation.frames.length) {
        if (animation.loop) {
          this.currentFrameIndex = 0;
        } else {
          this.currentFrameIndex = animation.frames.length - 1;
          this.playing = false;
        }
      }
    }
  }

  getCurrentFrame(): AnimationFrame | null {
    if (!this.currentAnimation) return null;
    const animation = this.animations.get(this.currentAnimation);
    if (!animation) return null;
    return animation.frames[this.currentFrameIndex] || null;
  }

  clone(): Sprite {
    const sprite = new Sprite();
    sprite.imagePath = this.imagePath;
    sprite.image = this.image;
    sprite.width = this.width;
    sprite.height = this.height;
    sprite.offsetX = this.offsetX;
    sprite.offsetY = this.offsetY;
    sprite.flipX = this.flipX;
    sprite.flipY = this.flipY;
    sprite.opacity = this.opacity;
    sprite.tint = this.tint;
    sprite.animations = new Map(this.animations);
    sprite.currentAnimation = this.currentAnimation;
    return sprite;
  }
}

