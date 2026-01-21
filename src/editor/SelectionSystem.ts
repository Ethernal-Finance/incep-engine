import { Vector2 } from '../utils/Vector2';
import { Renderer } from '../engine/Renderer';
import { Rect } from '../utils/Rect';

export interface SelectableInstance {
  id: string;
  position: Vector2;
  rotation: number;
  scale: Vector2;
  bounds: Rect;
  layer: number;
}

export class SelectionSystem {
  private selectedInstances: Set<string> = new Set();
  private boxSelectStart: Vector2 | null = null;
  private boxSelectEnd: Vector2 | null = null;
  private isBoxSelecting: boolean = false;
  private instances: Map<string, SelectableInstance> = new Map();
  private transformMode: 'move' | 'rotate' | 'scale' | null = null;
  private transformStart: Vector2 = new Vector2();
  private transformStartPos: Vector2 = new Vector2();
  private transformStartRot: number = 0;
  private transformStartScale: Vector2 = new Vector2(1, 1);
  private transformHandle: 'none' | 'move' | 'rotate' | 'scale-nw' | 'scale-ne' | 'scale-sw' | 'scale-se' = 'none';

  constructor() {}

  registerInstance(instance: SelectableInstance): void {
    this.instances.set(instance.id, instance);
  }

  unregisterInstance(id: string): void {
    this.instances.delete(id);
    this.selectedInstances.delete(id);
  }

  updateInstance(instance: SelectableInstance): void {
    this.instances.set(instance.id, instance);
  }

  // Single click selection
  selectAtPoint(worldPos: Vector2, shiftKey: boolean): string | null {
    // Find topmost instance at point
    let topmost: SelectableInstance | null = null;
    let topmostZ = -Infinity;

    for (const instance of this.instances.values()) {
      if (instance.bounds.containsPoint(worldPos)) {
        // Use layer as z-order (higher layer = on top)
        if (instance.layer > topmostZ) {
          topmost = instance;
          topmostZ = instance.layer;
        }
      }
    }

    if (topmost) {
      if (shiftKey) {
        // Toggle selection
        if (this.selectedInstances.has(topmost.id)) {
          this.selectedInstances.delete(topmost.id);
        } else {
          this.selectedInstances.add(topmost.id);
        }
      } else {
        // Replace selection
        this.selectedInstances.clear();
        this.selectedInstances.add(topmost.id);
      }
      return topmost.id;
    } else if (!shiftKey) {
      // Clear selection if not shift-clicking
      this.selectedInstances.clear();
    }
    return null;
  }

  // Box selection
  startBoxSelect(worldPos: Vector2, shiftKey: boolean): void {
    if (!shiftKey) {
      this.selectedInstances.clear();
    }
    this.isBoxSelecting = true;
    this.boxSelectStart = worldPos.copy();
    this.boxSelectEnd = worldPos.copy();
  }

  updateBoxSelect(worldPos: Vector2): void {
    if (this.isBoxSelecting && this.boxSelectStart) {
      this.boxSelectEnd = worldPos.copy();
      
      // Select all instances in box
      const box = Rect.fromPoints(this.boxSelectStart, this.boxSelectEnd);
      for (const instance of this.instances.values()) {
        if (box.intersects(instance.bounds)) {
          this.selectedInstances.add(instance.id);
        }
      }
    }
  }

  endBoxSelect(): void {
    this.isBoxSelecting = false;
    this.boxSelectStart = null;
    this.boxSelectEnd = null;
  }
  
  isBoxSelectingActive(): boolean {
    return this.isBoxSelecting;
  }

  // Transform handles
  getTransformHandle(worldPos: Vector2, zoom: number): 'none' | 'move' | 'rotate' | 'scale-nw' | 'scale-ne' | 'scale-sw' | 'scale-se' {
    if (this.selectedInstances.size === 0) return 'none';
    
    // Get selection bounds
    const bounds = this.getSelectionBounds();
    if (!bounds) return 'none';

    const handleSize = 8 / zoom;
    const handleRadius = handleSize * 1.5;

    // Check rotation handle (top center)
    const rotHandleY = bounds.y - 20 / zoom;
    const rotHandleX = bounds.x + bounds.width / 2;
    if (Vector2.distance(worldPos, new Vector2(rotHandleX, rotHandleY)) < handleRadius) {
      return 'rotate';
    }

    // Check scale handles (corners)
    const corners = [
      { x: bounds.x, y: bounds.y, handle: 'scale-nw' as const },
      { x: bounds.x + bounds.width, y: bounds.y, handle: 'scale-ne' as const },
      { x: bounds.x, y: bounds.y + bounds.height, handle: 'scale-sw' as const },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, handle: 'scale-se' as const }
    ];

    for (const corner of corners) {
      if (Vector2.distance(worldPos, new Vector2(corner.x, corner.y)) < handleRadius) {
        return corner.handle;
      }
    }

    // Check if inside bounds for move
    if (bounds.containsPoint(worldPos)) {
      return 'move';
    }

    return 'none';
  }

  startTransform(worldPos: Vector2, handle: 'move' | 'rotate' | 'scale-nw' | 'scale-ne' | 'scale-sw' | 'scale-se'): void {
    this.transformMode = handle === 'move' ? 'move' : handle.startsWith('scale') ? 'scale' : 'rotate';
    this.transformHandle = handle;
    this.transformStart = worldPos.copy();
    
    // Store initial transform state
    if (this.selectedInstances.size === 1) {
      const id = Array.from(this.selectedInstances)[0];
      const instance = this.instances.get(id);
      if (instance) {
        this.transformStartPos = instance.position.copy();
        this.transformStartRot = instance.rotation;
        this.transformStartScale = instance.scale.copy();
      }
    }
  }

  updateTransform(worldPos: Vector2, maintainAspect: boolean, angleSnap: (angle: number) => number): void {
    if (!this.transformMode || this.selectedInstances.size === 0) return;

    const delta = Vector2.subtract(worldPos, this.transformStart);

    if (this.transformMode === 'move') {
      // Move all selected instances
      for (const id of this.selectedInstances) {
        const instance = this.instances.get(id);
        if (instance) {
          instance.position = Vector2.add(this.transformStartPos, delta);
        }
      }
    } else if (this.transformMode === 'rotate') {
      // Rotate around center
      if (this.selectedInstances.size === 1) {
        const id = Array.from(this.selectedInstances)[0];
        const instance = this.instances.get(id);
        if (instance) {
          const bounds = instance.bounds;
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          
          const angle = Math.atan2(worldPos.y - centerY, worldPos.x - centerX);
          instance.rotation = angleSnap(angle);
        }
      }
    } else if (this.transformMode === 'scale') {
      // Scale from opposite corner
      if (this.selectedInstances.size === 1) {
        const id = Array.from(this.selectedInstances)[0];
        const instance = this.instances.get(id);
        if (instance) {
          const bounds = instance.bounds;
          const centerX = bounds.x + bounds.width / 2;
          const centerY = bounds.y + bounds.height / 2;
          
          let scaleX = 1;
          let scaleY = 1;
          
          if (this.transformHandle === 'scale-nw') {
            scaleX = (bounds.width - delta.x) / bounds.width;
            scaleY = (bounds.height - delta.y) / bounds.height;
          } else if (this.transformHandle === 'scale-ne') {
            scaleX = (bounds.width + delta.x) / bounds.width;
            scaleY = (bounds.height - delta.y) / bounds.height;
          } else if (this.transformHandle === 'scale-sw') {
            scaleX = (bounds.width - delta.x) / bounds.width;
            scaleY = (bounds.height + delta.y) / bounds.height;
          } else if (this.transformHandle === 'scale-se') {
            scaleX = (bounds.width + delta.x) / bounds.width;
            scaleY = (bounds.height + delta.y) / bounds.height;
          }
          
          if (maintainAspect) {
            const avgScale = (scaleX + scaleY) / 2;
            scaleX = avgScale;
            scaleY = avgScale;
          }
          
          instance.scale = new Vector2(
            this.transformStartScale.x * scaleX,
            this.transformStartScale.y * scaleY
          );
        }
      }
    }
  }

  endTransform(): void {
    this.transformMode = null;
    this.transformHandle = 'none';
  }

  // Nudge with arrow keys
  nudge(direction: Vector2, gridStep: number, useGrid: boolean): void {
    const delta = useGrid 
      ? new Vector2(direction.x * gridStep, direction.y * gridStep)
      : new Vector2(direction.x, direction.y);
    
    for (const id of this.selectedInstances) {
      const instance = this.instances.get(id);
      if (instance) {
        instance.position.add(delta);
      }
    }
  }

  // Duplicate selection
  duplicateSelection(): Map<string, SelectableInstance> {
    const duplicates = new Map<string, SelectableInstance>();
    const offset = new Vector2(10, 10); // Small offset for duplicates
    
    for (const id of this.selectedInstances) {
      const original = this.instances.get(id);
      if (original) {
        const duplicate: SelectableInstance = {
          id: `${id}_copy_${Date.now()}`,
          position: Vector2.add(original.position, offset),
          rotation: original.rotation,
          scale: original.scale.copy(),
          bounds: new Rect(
            original.bounds.x + offset.x,
            original.bounds.y + offset.y,
            original.bounds.width,
            original.bounds.height
          ),
          layer: original.layer
        };
        duplicates.set(duplicate.id, duplicate);
        this.instances.set(duplicate.id, duplicate);
      }
    }
    
    // Select duplicates
    this.selectedInstances.clear();
    for (const id of duplicates.keys()) {
      this.selectedInstances.add(id);
    }
    
    return duplicates;
  }

  getSelectionBounds(): Rect | null {
    if (this.selectedInstances.size === 0) return null;
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (const id of this.selectedInstances) {
      const instance = this.instances.get(id);
      if (instance) {
        const bounds = instance.bounds;
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }
    }
    
    return new Rect(minX, minY, maxX - minX, maxY - minY);
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedInstances);
  }

  clearSelection(): void {
    this.selectedInstances.clear();
  }

  // Render selection and transform handles
  render(renderer: Renderer, zoom: number): void {
    const ctx = renderer.getContext();
    
    // Render box select
    if (this.isBoxSelecting && this.boxSelectStart && this.boxSelectEnd) {
      const box = Rect.fromPoints(this.boxSelectStart, this.boxSelectEnd);
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);
    }
    
    // Render selection bounds and handles
    const bounds = this.getSelectionBounds();
    if (bounds) {
      // Selection outline
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 2 / zoom;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // Transform handles
      const handleSize = 8 / zoom;
      ctx.fillStyle = '#4a9eff';
      
      // Corner handles
      const corners = [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x, y: bounds.y + bounds.height },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
      ];
      
      for (const corner of corners) {
        ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
      }
      
      // Rotation handle
      const rotHandleY = bounds.y - 20 / zoom;
      const rotHandleX = bounds.x + bounds.width / 2;
      ctx.beginPath();
      ctx.arc(rotHandleX, rotHandleY, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Line from center to rotation handle
      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
      ctx.lineTo(rotHandleX, rotHandleY);
      ctx.stroke();
    }
  }
}

