export interface AudioPlayOptions {
  loop?: boolean;
  volume?: number;
}

export class AudioManager {
  private static soundSources: Map<string, string> = new Map();
  private static backgroundAudio: HTMLAudioElement | null = null;

  static resolvePath(soundRef: string): string {
    if (soundRef.startsWith('/') || soundRef.startsWith('http://') || soundRef.startsWith('https://')) {
      return soundRef;
    }
    return `/assets/${soundRef}`;
  }

  static async loadSound(path: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.oncanplaythrough = () => {
        AudioManager.soundSources.set(name, path);
        resolve();
      };
      audio.onerror = () => {
        reject(new Error(`Failed to load sound: ${path}`));
      };
      audio.src = path;
      audio.load();
    });
  }

  static ensureSound(soundRef: string): void {
    if (!soundRef) return;
    if (AudioManager.soundSources.has(soundRef)) return;
    const path = AudioManager.resolvePath(soundRef);
    AudioManager.soundSources.set(soundRef, path);
  }

  static playSound(soundRef: string, options: AudioPlayOptions = {}): void {
    if (!soundRef) return;
    AudioManager.ensureSound(soundRef);
    const path = AudioManager.soundSources.get(soundRef) || AudioManager.resolvePath(soundRef);
    const audio = new Audio(path);
    audio.volume = options.volume ?? 0.8;
    audio.loop = options.loop ?? false;
    audio.play().catch(() => {
      // Ignore autoplay restrictions or playback errors.
    });
  }

  static playBackground(soundRef: string, volume: number = 0.6): void {
    if (!soundRef) return;
    AudioManager.stopBackground();
    AudioManager.ensureSound(soundRef);
    const path = AudioManager.soundSources.get(soundRef) || AudioManager.resolvePath(soundRef);
    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = volume;
    audio.play().catch(() => {
      // Ignore autoplay restrictions or playback errors.
    });
    AudioManager.backgroundAudio = audio;
  }

  static stopBackground(): void {
    if (AudioManager.backgroundAudio) {
      AudioManager.backgroundAudio.pause();
      AudioManager.backgroundAudio.currentTime = 0;
      AudioManager.backgroundAudio = null;
    }
  }
}
