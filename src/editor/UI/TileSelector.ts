import { AssetLoader } from '../../engine/AssetLoader';
import { AssetManager, TilesetInfo } from './AssetManager';

export class TileSelector {
  private container: HTMLElement;
  private tilesetSelect: HTMLSelectElement;
  private tilePreview: HTMLElement;
  private tileInfo: HTMLElement;
  private fileInput!: HTMLInputElement;
  private selectedTile: number = 1;
  private selectedStampWidth: number = 1;
  private selectedStampHeight: number = 1;
  private currentTilesetInfo: TilesetInfo | null = null;
  private onTileSelected?: (tileId: number) => void;
  private onStampSelected?: (tileIds: number[], width: number, height: number) => void;
  private onTilesetChanged?: (info: TilesetInfo) => void;
  private assetManager: AssetManager;
  private previewCanvas: HTMLCanvasElement | null = null;
  private previewCtx: CanvasRenderingContext2D | null = null;
  private previewImage: HTMLImageElement | null = null;
  private previewCols: number = 0;
  private previewRows: number = 0;
  private previewTileSize: number = 32;
  private renderQueued: boolean = false;
  private lastRenderSize: { width: number; height: number } | null = null;
  private readonly baseDisplayTileSize = 40;
  private zoomLevel: number = 1;
  private readonly padding = 4;
  private selectionStart: { col: number; row: number } | null = null;
  private selectionEnd: { col: number; row: number } | null = null;
  private isSelecting: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.tilesetSelect = document.getElementById('tileset-select') as HTMLSelectElement;
    this.tilePreview = document.getElementById('tile-preview')!;
    const tileInfoEl = this.container.querySelector('.tile-info');
    this.tileInfo = tileInfoEl as HTMLElement;
    this.assetManager = new AssetManager();
    
    this.setupFileInput();
    this.setupTilesetSelect();
    this.setupTileZoom();
    
    // Delay loading to ensure tileset is ready
    // If no tileset is selected after assets load, use default
    setTimeout(() => {
      if (!this.currentTilesetInfo) {
        this.loadDefaultTileset();
      }
    }, 500);
  }

  private setupFileInput(): void {
    // Create hidden file input
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/*';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);

    this.fileInput.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const info = await this.assetManager.loadTilesetFromFile(file);
          this.currentTilesetInfo = info;
          this.loadTileset(info.path);
          
          // Add to dropdown (before the "Load from file" option)
          const loadFileOption = this.tilesetSelect.querySelector('option[value="__load_file__"]');
          const option = document.createElement('option');
          option.value = info.path;
          option.textContent = info.name;
          if (loadFileOption) {
            this.tilesetSelect.insertBefore(option, loadFileOption);
          } else {
            this.tilesetSelect.appendChild(option);
          }
          this.tilesetSelect.value = info.path;
          
          // Notify tileset changed
          if (this.onTilesetChanged) {
            this.onTilesetChanged(info);
          }
        } catch (error) {
          console.error('Failed to load tileset:', error);
          alert('Failed to load tileset image');
        }
      }
    });

    this.assetManager.setOnTilesetLoaded((_tilesetName, info) => {
      // Update dropdown when tileset is loaded from assets folder
      const existingOption = this.tilesetSelect.querySelector(`option[value="${info.path}"]`);
      if (!existingOption) {
        const loadFileOption = this.tilesetSelect.querySelector('option[value="__load_file__"]');
        const option = document.createElement('option');
        option.value = info.path;
        option.textContent = info.name;
        if (loadFileOption) {
          this.tilesetSelect.insertBefore(option, loadFileOption);
        } else {
          this.tilesetSelect.appendChild(option);
        }
      }
      
      // If this is the first loaded tileset, select it
      if (!this.currentTilesetInfo && info.name === 'Modern Exteriors Complete Tileset') {
        this.currentTilesetInfo = info;
        this.tilesetSelect.value = info.path;
        this.loadTileset(info.path);
        if (this.onTilesetChanged) {
          this.onTilesetChanged(info);
        }
      }
    });
  }

  private setupTilesetSelect(): void {
    if (this.tilesetSelect) {
      // Add default tileset
      this.tilesetSelect.innerHTML = '<option value="default-tileset">Default Tileset</option>';
      
      // Add available tilesets from assets folder
      const availableTilesets = this.assetManager.getAvailableTilesets();
      for (const tileset of availableTilesets) {
        const option = document.createElement('option');
        option.value = tileset.path;
        option.textContent = tileset.name;
        this.tilesetSelect.appendChild(option);
      }
      
      // Add load from file option
      const loadFileOption = document.createElement('option');
      loadFileOption.value = '__load_file__';
      loadFileOption.textContent = 'Load from file...';
      this.tilesetSelect.appendChild(loadFileOption);

      this.tilesetSelect.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value;
        if (value === '__load_file__') {
          this.fileInput.click();
          // Reset to previous selection
          setTimeout(() => {
            const prevValue = this.currentTilesetInfo?.path || 'default-tileset';
            this.tilesetSelect.value = prevValue;
          }, 100);
        } else {
          this.loadTileset(value);
        }
      });
    }
  }

  private loadDefaultTileset(): void {
    this.loadTileset('default-tileset');
  }

  private loadTileset(tilesetName: string, options: { notify?: boolean } = {}): void {
    const tilesetImage = AssetLoader.getImage(tilesetName);
    if (!tilesetImage) {
      this.tilePreview.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Tileset not found</div>';
      return;
    }

    const availableTileset = this.assetManager.getAvailableTilesets().find((tileset) => tileset.path === tilesetName);

    // Get tileset info
    let tileSize = 32;
    let cols = 8;
    let rows = 8;

    if (this.currentTilesetInfo && this.currentTilesetInfo.path === tilesetName) {
      tileSize = this.currentTilesetInfo.tileSize;
      cols = this.currentTilesetInfo.columns;
      rows = this.currentTilesetInfo.rows;
    } else if (availableTileset) {
      tileSize = availableTileset.tileSize;
      cols = availableTileset.columns;
      rows = availableTileset.rows;
    } else if (tilesetName === 'default-tileset') {
      // Default tileset info
      tileSize = 32;
      cols = 8;
      rows = 8;
    } else {
      // Try to detect from image dimensions
      const imgWidth = tilesetImage.width;
      const imgHeight = tilesetImage.height;
      if (imgWidth % 32 === 0 && imgHeight % 32 === 0) {
        tileSize = 32;
        cols = imgWidth / 32;
        rows = imgHeight / 32;
      } else if (imgWidth % 16 === 0 && imgHeight % 16 === 0) {
        tileSize = 16;
        cols = imgWidth / 16;
        rows = imgHeight / 16;
      }
    }

    // Create canvas to display tiles
    const canvas = document.createElement('canvas');
    canvas.width = cols * (this.getDisplayTileSize() + this.padding) + this.padding;
    canvas.height = rows * (this.getDisplayTileSize() + this.padding) + this.padding;
    const ctx = canvas.getContext('2d')!;
    this.previewCanvas = canvas;
    this.previewCtx = ctx;
    this.previewImage = tilesetImage;
    this.previewCols = cols;
    this.previewRows = rows;
    this.previewTileSize = tileSize;
    this.lastRenderSize = null;

    if (this.selectionStart && (this.selectionStart.col >= cols || this.selectionStart.row >= rows)) {
      this.selectionStart = null;
      this.selectionEnd = null;
    }

    this.renderTileset();

    canvas.addEventListener('pointerdown', (e) => this.onPreviewPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPreviewPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPreviewPointerUp(e));

    this.tilePreview.innerHTML = '';
    this.tilePreview.appendChild(canvas);

    const tilesetInfo: TilesetInfo = {
      name: availableTileset?.name ?? (tilesetName === 'default-tileset' ? 'Default Tileset' : tilesetName),
      path: tilesetName,
      tileSize,
      columns: cols,
      rows
    };

    const tilesetChanged = this.currentTilesetInfo?.path !== tilesetName;
    this.currentTilesetInfo = tilesetInfo;
    const notify = options.notify !== false;
    if (notify && tilesetChanged && this.onTilesetChanged) {
      this.onTilesetChanged(tilesetInfo);
    }
  }

  selectTile(tileId: number): void {
    this.selectedTile = tileId;
    this.selectedStampWidth = 1;
    this.selectedStampHeight = 1;
    this.selectionStart = null;
    this.selectionEnd = null;
    if (this.tileInfo) {
      this.tileInfo.textContent = `Tile ${tileId} selected`;
    }
    if (this.onTileSelected) {
      this.onTileSelected(tileId);
    }
    this.requestRenderTileset();
  }

  getSelectedTile(): number {
    return this.selectedTile;
  }

  setOnTileSelected(callback: (tileId: number) => void): void {
    this.onTileSelected = callback;
  }

  setOnStampSelected(callback: (tileIds: number[], width: number, height: number) => void): void {
    this.onStampSelected = callback;
  }

  setOnTilesetChanged(callback: (info: TilesetInfo) => void): void {
    this.onTilesetChanged = callback;
    if (this.currentTilesetInfo) {
      this.onTilesetChanged(this.currentTilesetInfo);
    }
  }

  getCurrentTilesetInfo(): TilesetInfo | null {
    return this.currentTilesetInfo;
  }

  syncTileset(tilesetName: string): void {
    if (!this.tilesetSelect) return;
    const resolvedTileset = tilesetName && tilesetName.length > 0 ? tilesetName : 'default-tileset';
    const existingOption = this.tilesetSelect.querySelector(`option[value="${resolvedTileset}"]`);
    if (!existingOption) {
      const option = document.createElement('option');
      option.value = resolvedTileset;
      option.textContent = resolvedTileset;
      this.tilesetSelect.appendChild(option);
    }
    this.tilesetSelect.value = resolvedTileset;
    this.loadTileset(resolvedTileset, { notify: false });
  }

  private onPreviewPointerDown(event: PointerEvent): void {
    if (!this.previewCanvas) return;
    const tile = this.getTileFromEvent(event);
    if (!tile) return;
    this.isSelecting = true;
    this.selectionStart = { col: tile.col, row: tile.row };
    this.selectionEnd = { col: tile.col, row: tile.row };
    this.requestRenderTileset();
    this.previewCanvas.setPointerCapture(event.pointerId);
  }

  private onPreviewPointerMove(event: PointerEvent): void {
    if (!this.isSelecting || !this.previewCanvas) return;
    const tile = this.getTileFromEvent(event);
    if (!tile) return;
    this.selectionEnd = { col: tile.col, row: tile.row };
    this.requestRenderTileset();
  }

  private onPreviewPointerUp(event: PointerEvent): void {
    if (!this.isSelecting) return;
    this.isSelecting = false;
    if (!this.selectionStart || !this.selectionEnd) return;

    const minCol = Math.min(this.selectionStart.col, this.selectionEnd.col);
    const maxCol = Math.max(this.selectionStart.col, this.selectionEnd.col);
    const minRow = Math.min(this.selectionStart.row, this.selectionEnd.row);
    const maxRow = Math.max(this.selectionStart.row, this.selectionEnd.row);
    const width = maxCol - minCol + 1;
    const height = maxRow - minRow + 1;

    if (width === 1 && height === 1) {
      const tileId = minRow * this.previewCols + minCol + 1;
      if (this.previewCanvas) {
        this.previewCanvas.releasePointerCapture(event.pointerId);
      }
      this.selectTile(tileId);
      return;
    }

    const tileIds: number[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        tileIds.push(row * this.previewCols + col + 1);
      }
    }

    this.selectStamp(tileIds, width, height);
    if (this.previewCanvas) {
      this.previewCanvas.releasePointerCapture(event.pointerId);
    }
  }

  private selectStamp(tileIds: number[], width: number, height: number): void {
    if (!tileIds.length) return;
    this.selectedTile = tileIds[0];
    this.selectedStampWidth = width;
    this.selectedStampHeight = height;
    this.selectionStart = {
      col: (tileIds[0] - 1) % this.previewCols,
      row: Math.floor((tileIds[0] - 1) / this.previewCols)
    };
    this.selectionEnd = {
      col: this.selectionStart.col + width - 1,
      row: this.selectionStart.row + height - 1
    };

    if (this.tileInfo) {
      this.tileInfo.textContent = `Tiles ${width}x${height} selected`;
    }

    if (this.onStampSelected) {
      this.onStampSelected(tileIds, width, height);
    }

    this.requestRenderTileset();
  }

  private requestRenderTileset(): void {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.renderTileset();
    });
  }

  private getTileFromEvent(event: PointerEvent): { col: number; row: number } | null {
    if (!this.previewCanvas) return null;
    const rect = this.previewCanvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const displayTileSize = this.getDisplayTileSize();
    const col = Math.floor((clickX - this.padding) / (displayTileSize + this.padding));
    const row = Math.floor((clickY - this.padding) / (displayTileSize + this.padding));
    if (col < 0 || row < 0 || col >= this.previewCols || row >= this.previewRows) {
      return null;
    }
    return { col, row };
  }

  private renderTileset(): void {
    if (!this.previewCanvas || !this.previewCtx || !this.previewImage) return;
    const ctx = this.previewCtx;
    const cols = this.previewCols;
    const rows = this.previewRows;
    const displayTileSize = this.getDisplayTileSize();
    const width = cols * (displayTileSize + this.padding) + this.padding;
    const height = rows * (displayTileSize + this.padding) + this.padding;
    if (!this.lastRenderSize || this.lastRenderSize.width !== width || this.lastRenderSize.height !== height) {
      this.previewCanvas.width = width;
      this.previewCanvas.height = height;
      this.lastRenderSize = { width, height };
    }

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileId = row * cols + col + 1;
        const x = this.padding + col * (displayTileSize + this.padding);
        const y = this.padding + row * (displayTileSize + this.padding);
        const srcX = col * this.previewTileSize;
        const srcY = row * this.previewTileSize;

        ctx.drawImage(
          this.previewImage,
          srcX, srcY, this.previewTileSize, this.previewTileSize,
          x, y, displayTileSize, displayTileSize
        );

        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, displayTileSize, displayTileSize);

        if (tileId === this.selectedTile && this.selectedStampWidth === 1 && this.selectedStampHeight === 1) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 1, y - 1, displayTileSize + 2, displayTileSize + 2);
        }
      }
    }

    if (this.selectionStart && this.selectionEnd) {
      const minCol = Math.min(this.selectionStart.col, this.selectionEnd.col);
      const maxCol = Math.max(this.selectionStart.col, this.selectionEnd.col);
      const minRow = Math.min(this.selectionStart.row, this.selectionEnd.row);
      const maxRow = Math.max(this.selectionStart.row, this.selectionEnd.row);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const x = this.padding + col * (displayTileSize + this.padding);
          const y = this.padding + row * (displayTileSize + this.padding);
          ctx.strokeRect(x - 1, y - 1, displayTileSize + 2, displayTileSize + 2);
        }
      }
    }
  }

  private setupTileZoom(): void {
    const zoomInput = document.getElementById('tile-zoom-range') as HTMLInputElement | null;
    if (!zoomInput) return;
    this.zoomLevel = Number(zoomInput.value) / 100;
    zoomInput.addEventListener('input', () => {
      const value = Number(zoomInput.value);
      this.zoomLevel = isNaN(value) ? 1 : value / 100;
      this.requestRenderTileset();
    });
  }

  private getDisplayTileSize(): number {
    return Math.max(8, Math.round(this.baseDisplayTileSize * this.zoomLevel));
  }
}
