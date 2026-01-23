export class AssetLoader {
  public static images: Map<string, HTMLImageElement> = new Map();
  private static loaded: boolean = false;

  static async loadImage(path: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        AssetLoader.images.set(name, img);
        resolve();
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });
  }

  static async loadImages(assets: { path: string; name: string }[]): Promise<void> {
    const promises = assets.map((asset) => AssetLoader.loadImage(asset.path, asset.name));
    await Promise.all(promises);
    AssetLoader.loaded = true;
  }

  static registerImage(name: string, image: HTMLImageElement): void {
    AssetLoader.images.set(name, image);
    AssetLoader.loaded = true;
  }

  static async loadImageFromCanvas(canvas: HTMLCanvasElement, name: string): Promise<void> {
    return AssetLoader.loadImage(canvas.toDataURL('image/png'), name);
  }

  static getImage(name: string): HTMLImageElement | null {
    return AssetLoader.images.get(name) || null;
  }

  static isLoaded(): boolean {
    return AssetLoader.loaded;
  }
}

