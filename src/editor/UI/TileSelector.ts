import { AssetLoader } from '../../engine/AssetLoader';
import { AssetManager, TilesetInfo } from './AssetManager';

export class TileSelector {
  private container: HTMLElement;
  private tilesetSelect: HTMLSelectElement;
  private tilePreview: HTMLElement;
  private tileInfo: HTMLElement;
  private fileInput!: HTMLInputElement;
  private selectedTile: number = 1;
  private currentTilesetInfo: TilesetInfo | null = null;
  private onTileSelected?: (tileId: number) => void;
  private onTilesetChanged?: (info: TilesetInfo) => void;
  private assetManager: AssetManager;

  constructor(container: HTMLElement) {
    this.container = container;
    this.tilesetSelect = document.getElementById('tileset-select') as HTMLSelectElement;
    this.tilePreview = document.getElementById('tile-preview')!;
    const tileInfoEl = this.container.querySelector('.tile-info');
    this.tileInfo = tileInfoEl as HTMLElement;
    this.assetManager = new AssetManager();
    
    this.setupFileInput();
    this.setupTilesetSelect();
    
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

  private loadTileset(tilesetName: string): void {
    const tilesetImage = AssetLoader.getImage(tilesetName);
    if (!tilesetImage) {
      this.tilePreview.innerHTML = '<div style="padding: 20px; text-align: center; color: #888;">Tileset not found</div>';
      return;
    }

    // Get tileset info
    let tileSize = 32;
    let cols = 8;
    let rows = 8;

    if (this.currentTilesetInfo && this.currentTilesetInfo.path === tilesetName) {
      tileSize = this.currentTilesetInfo.tileSize;
      cols = this.currentTilesetInfo.columns;
      rows = this.currentTilesetInfo.rows;
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
    const displayTileSize = 40; // Size to display in preview
    const padding = 4;
    
    canvas.width = cols * (displayTileSize + padding) + padding;
    canvas.height = rows * (displayTileSize + padding) + padding;
    const ctx = canvas.getContext('2d')!;

    // Draw grid background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileId = row * cols + col + 1;
        const x = padding + col * (displayTileSize + padding);
        const y = padding + row * (displayTileSize + padding);
        const srcX = col * tileSize;
        const srcY = row * tileSize;

        // Draw tile
        ctx.drawImage(
          tilesetImage,
          srcX, srcY, tileSize, tileSize,
          x, y, displayTileSize, displayTileSize
        );

        // Draw border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, displayTileSize, displayTileSize);

        // Highlight selected tile
        if (tileId === this.selectedTile) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 1, y - 1, displayTileSize + 2, displayTileSize + 2);
        }
      }
    }

    // Add click handler
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const col = Math.floor((clickX - padding) / (displayTileSize + padding));
      const row = Math.floor((clickY - padding) / (displayTileSize + padding));

      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        const tileId = row * cols + col + 1;
        this.selectTile(tileId);
      }
    });

    this.tilePreview.innerHTML = '';
    this.tilePreview.appendChild(canvas);
  }

  selectTile(tileId: number): void {
    this.selectedTile = tileId;
    if (this.tileInfo) {
      this.tileInfo.textContent = `Tile ${tileId} selected`;
    }
    if (this.onTileSelected) {
      this.onTileSelected(tileId);
    }
    // Reload to show selection - preserve current tileset
    const currentTileset = this.currentTilesetInfo?.path || 'default-tileset';
    this.loadTileset(currentTileset);
  }

  getSelectedTile(): number {
    return this.selectedTile;
  }

  setOnTileSelected(callback: (tileId: number) => void): void {
    this.onTileSelected = callback;
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
}
