import { Vector2 } from '../utils/Vector2';

export interface LayerProperties {
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  parallaxX: number;
  parallaxY: number;
  zIndex: number;
}

export class LayerSystem {
  private layers: LayerProperties[] = [];
  private activeLayerIndex: number = 0;

  constructor() {
    // Add default layer
    this.addLayer('Layer 0');
  }

  addLayer(name: string, insertIndex?: number): number {
    const layer: LayerProperties = {
      name,
      visible: true,
      locked: false,
      opacity: 1.0,
      parallaxX: 1.0,
      parallaxY: 1.0,
      zIndex: this.layers.length
    };
    
    if (insertIndex !== undefined) {
      this.layers.splice(insertIndex, 0, layer);
      this.updateZIndices();
    } else {
      this.layers.push(layer);
    }
    
    return this.layers.length - 1;
  }

  removeLayer(index: number): void {
    if (this.layers.length <= 1) return; // Keep at least one layer
    if (index < 0 || index >= this.layers.length) return;
    
    this.layers.splice(index, 1);
    this.updateZIndices();
    
    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1;
    }
  }

  reorderLayer(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.layers.length) return;
    if (toIndex < 0 || toIndex >= this.layers.length) return;
    
    const layer = this.layers.splice(fromIndex, 1)[0];
    this.layers.splice(toIndex, 0, layer);
    this.updateZIndices();
  }

  private updateZIndices(): void {
    this.layers.forEach((layer, index) => {
      layer.zIndex = index;
    });
  }

  setActiveLayer(index: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.activeLayerIndex = index;
    }
  }

  getActiveLayerIndex(): number {
    return this.activeLayerIndex;
  }

  getActiveLayer(): LayerProperties | null {
    if (this.activeLayerIndex >= 0 && this.activeLayerIndex < this.layers.length) {
      return this.layers[this.activeLayerIndex];
    }
    return null;
  }

  getLayer(index: number): LayerProperties | null {
    if (index >= 0 && index < this.layers.length) {
      return this.layers[index];
    }
    return null;
  }

  getAllLayers(): LayerProperties[] {
    return [...this.layers];
  }

  setLayerVisible(index: number, visible: boolean): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].visible = visible;
    }
  }

  setLayerLocked(index: number, locked: boolean): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].locked = locked;
    }
  }

  setLayerOpacity(index: number, opacity: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  setLayerParallax(index: number, parallaxX: number, parallaxY: number): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].parallaxX = parallaxX;
      this.layers[index].parallaxY = parallaxY;
    }
  }

  setLayerName(index: number, name: string): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].name = name;
    }
  }

  canEditLayer(index: number): boolean {
    if (index < 0 || index >= this.layers.length) return false;
    return !this.layers[index].locked;
  }

  isLayerVisible(index: number): boolean {
    if (index < 0 || index >= this.layers.length) return false;
    return this.layers[index].visible;
  }
}

