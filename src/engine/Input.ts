import { Vector2 } from '../utils/Vector2';

export class Input {
  private static keys: Map<string, boolean> = new Map();
  private static keysDown: Map<string, boolean> = new Map();
  private static keysUp: Map<string, boolean> = new Map();
  private static mousePosition: Vector2 = new Vector2();
  private static mouseButtons: Map<number, boolean> = new Map();
  private static mouseButtonsDown: Map<number, boolean> = new Map();
  private static mouseButtonsUp: Map<number, boolean> = new Map();

  static init(canvas: HTMLCanvasElement): void {
    window.addEventListener('keydown', (e) => {
      if (!Input.keys.get(e.key)) {
        Input.keysDown.set(e.key, true);
      }
      Input.keys.set(e.key, true);
    });

    window.addEventListener('keyup', (e) => {
      Input.keysUp.set(e.key, true);
      Input.keys.set(e.key, false);
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      Input.mousePosition.x = e.clientX - rect.left;
      Input.mousePosition.y = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (!Input.mouseButtons.get(e.button)) {
        Input.mouseButtonsDown.set(e.button, true);
      }
      Input.mouseButtons.set(e.button, true);
    });

    canvas.addEventListener('mouseup', (e) => {
      Input.mouseButtonsUp.set(e.button, true);
      Input.mouseButtons.set(e.button, false);
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  static update(): void {
    Input.keysDown.clear();
    Input.keysUp.clear();
    Input.mouseButtonsDown.clear();
    Input.mouseButtonsUp.clear();
  }

  static getKey(key: string): boolean {
    return Input.keys.get(key) || false;
  }

  static getKeyDown(key: string): boolean {
    return Input.keysDown.get(key) || false;
  }

  static getKeyUp(key: string): boolean {
    return Input.keysUp.get(key) || false;
  }

  static getMousePosition(): Vector2 {
    return Input.mousePosition.copy();
  }

  static getMouseButton(button: number): boolean {
    return Input.mouseButtons.get(button) || false;
  }

  static getMouseButtonDown(button: number): boolean {
    return Input.mouseButtonsDown.get(button) || false;
  }

  static getMouseButtonUp(button: number): boolean {
    return Input.mouseButtonsUp.get(button) || false;
  }
}

