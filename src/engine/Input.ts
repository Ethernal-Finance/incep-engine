import { Vector2 } from '../utils/Vector2';

export class Input {
  private static keys: Map<string, boolean> = new Map();
  private static keysPressed: Map<string, boolean> = new Map();
  private static keysReleased: Map<string, boolean> = new Map();
  private static mousePosition: Vector2 = Vector2.zero();
  private static mouseButtons: Map<number, boolean> = new Map();
  private static mouseButtonsPressed: Map<number, boolean> = new Map();
  private static mouseButtonsReleased: Map<number, boolean> = new Map();
  private static mouseWheelDelta: number = 0;

  static init(canvas: HTMLCanvasElement): void {
    window.addEventListener('keydown', (e) => {
      if (!Input.keys.get(e.code)) {
        Input.keysPressed.set(e.code, true);
      }
      Input.keys.set(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      Input.keysReleased.set(e.code, true);
      Input.keys.set(e.code, false);
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      Input.mousePosition = new Vector2(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    });

    canvas.addEventListener('mousedown', (e) => {
      if (!Input.mouseButtons.get(e.button)) {
        Input.mouseButtonsPressed.set(e.button, true);
      }
      Input.mouseButtons.set(e.button, true);
    });

    canvas.addEventListener('mouseup', (e) => {
      Input.mouseButtonsReleased.set(e.button, true);
      Input.mouseButtons.set(e.button, false);
    });

    canvas.addEventListener('wheel', (e) => {
      Input.mouseWheelDelta = e.deltaY;
      e.preventDefault();
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  static update(): void {
    // Clear one-frame states
    Input.keysPressed.clear();
    Input.keysReleased.clear();
    Input.mouseButtonsPressed.clear();
    Input.mouseButtonsReleased.clear();
    Input.mouseWheelDelta = 0;
  }

  static getKey(keyCode: string): boolean {
    return Input.keys.get(keyCode) || false;
  }

  static getKeyDown(keyCode: string): boolean {
    return Input.keysPressed.get(keyCode) || false;
  }

  static getKeyUp(keyCode: string): boolean {
    return Input.keysReleased.get(keyCode) || false;
  }

  static getMousePosition(): Vector2 {
    return Input.mousePosition.clone();
  }

  static getMouseButton(button: number): boolean {
    return Input.mouseButtons.get(button) || false;
  }

  static getMouseButtonDown(button: number): boolean {
    return Input.mouseButtonsPressed.get(button) || false;
  }

  static getMouseButtonUp(button: number): boolean {
    return Input.mouseButtonsReleased.get(button) || false;
  }

  static getMouseWheelDelta(): number {
    return Input.mouseWheelDelta;
  }

  // Convenience methods for common keys
  static getArrowUp(): boolean {
    return Input.getKey('ArrowUp');
  }

  static getArrowDown(): boolean {
    return Input.getKey('ArrowDown');
  }

  static getArrowLeft(): boolean {
    return Input.getKey('ArrowLeft');
  }

  static getArrowRight(): boolean {
    return Input.getKey('ArrowRight');
  }

  static getWASD(): { w: boolean; a: boolean; s: boolean; d: boolean } {
    return {
      w: Input.getKey('KeyW'),
      a: Input.getKey('KeyA'),
      s: Input.getKey('KeyS'),
      d: Input.getKey('KeyD')
    };
  }
}

