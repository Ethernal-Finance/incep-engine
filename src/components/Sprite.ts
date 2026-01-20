export class Sprite {
  public imageName: string;
  public width: number;
  public height: number;
  public offsetX: number;
  public offsetY: number;
  public visible: boolean;
  public opacity: number;
  public flipX: boolean;
  public flipY: boolean;

  constructor(
    imageName: string,
    width: number = 32,
    height: number = 32,
    offsetX: number = 0,
    offsetY: number = 0
  ) {
    this.imageName = imageName;
    this.width = width;
    this.height = height;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.visible = true;
    this.opacity = 1;
    this.flipX = false;
    this.flipY = false;
  }
}

