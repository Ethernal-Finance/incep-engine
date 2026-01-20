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
  speed: number; // multiplier
}

export class AnimationState {
  public currentAnimation: string | null = null;
  public currentFrame: number = 0;
  public frameTime: number = 0;
  public animations: Map<string, Animation> = new Map();
  public playing: boolean = true;

  addAnimation(animation: Animation): void {
    this.animations.set(animation.name, animation);
  }

  play(animationName: string, reset: boolean = true): void {
    if (!this.animations.has(animationName)) return;

    if (this.currentAnimation !== animationName || reset) {
      this.currentAnimation = animationName;
      this.currentFrame = 0;
      this.frameTime = 0;
    }
  }

  update(deltaTime: number): void {
    if (!this.playing || !this.currentAnimation) return;

    const animation = this.animations.get(this.currentAnimation);
    if (!animation || animation.frames.length === 0) return;

    this.frameTime += deltaTime * animation.speed;
    const frame = animation.frames[this.currentFrame];
    const frameDuration = frame.duration;

    if (this.frameTime >= frameDuration) {
      this.frameTime -= frameDuration;
      this.currentFrame++;

      if (this.currentFrame >= animation.frames.length) {
        if (animation.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = animation.frames.length - 1;
          this.playing = false;
        }
      }
    }
  }

  getCurrentFrame(): AnimationFrame | null {
    if (!this.currentAnimation) return null;
    const animation = this.animations.get(this.currentAnimation);
    if (!animation) return null;
    return animation.frames[this.currentFrame] || null;
  }
}

export class AnimationSystem {
  update(deltaTime: number, animationStates: AnimationState[]): void {
    for (const state of animationStates) {
      state.update(deltaTime);
    }
  }
}

