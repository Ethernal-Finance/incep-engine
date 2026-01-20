export class Time {
  private static deltaTime: number = 0;
  private static lastTime: number = 0;
  private static fixedDeltaTime: number = 1 / 60; // 60 FPS
  private static timeScale: number = 1;

  static init(): void {
    Time.lastTime = performance.now();
  }

  static update(): void {
    const currentTime = performance.now();
    Time.deltaTime = (currentTime - Time.lastTime) / 1000; // Convert to seconds
    Time.lastTime = currentTime;
  }

  static getDeltaTime(): number {
    return Time.deltaTime * Time.timeScale;
  }

  static getFixedDeltaTime(): number {
    return Time.fixedDeltaTime * Time.timeScale;
  }

  static getTimeScale(): number {
    return Time.timeScale;
  }

  static setTimeScale(scale: number): void {
    Time.timeScale = Math.max(0, scale);
  }
}

