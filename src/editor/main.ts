import { Editor, EditorTool } from './Editor';
import { EditorUI } from './UI/EditorUI';
import { Input } from '../engine/Input';
import { Time } from '../engine/Time';
import { Level } from '../data/Level';
import { Game } from '../engine/Game';
import { GameScene } from '../runtime/GameScene';

class EditorApp {
  private editor: Editor;
  private editorUI: EditorUI;
  private running: boolean = false;
  private runtimeMode: boolean = false;
  private runtimeGame: Game | null = null;
  private runtimeScene: GameScene | null = null;

  constructor() {
    const container = document.getElementById('editor-container');
    if (!container) {
      throw new Error('Editor container not found');
    }

    this.editorUI = new EditorUI(container);
    const canvas = this.editorUI.getCanvas();
    
    // Set canvas size
    const resizeCanvas = () => {
      const sidebarWidth = 280;
      const topBarHeight = 48;
      const statusBarHeight = 32;
      const width = window.innerWidth - sidebarWidth;
      const height = window.innerHeight - topBarHeight - statusBarHeight;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    this.editor = new Editor(canvas);
    
    // Connect tile selector to editor
    const tileSelector = this.editorUI.getTileSelector();
    tileSelector.setOnTileSelected((tileId) => {
      this.editor.getTilemapEditor().setSelectedTile(tileId);
    });
    
    tileSelector.setOnTilesetChanged((info) => {
      // Update tilemap with new tileset info
      const level = this.editor.getLevel();
      level.tilemap.tilesetImage = info.path;
      level.tilemap.tilesetColumns = info.columns;
      level.tilemap.tilesetRows = info.rows;
      level.tilemap.tileSize = info.tileSize;
    });
    
    // Wire tool buttons first
    this.editorUI.setOnToolChanged((tool) => {
      console.log(`Tool changed callback triggered: ${tool}`);
      this.editor.setTool(tool);
    });
    
    // Set default tool to Paint (this will also update UI)
    console.log('Setting default tool to Paint...');
    this.editorUI.setTool(EditorTool.Paint);
    this.editor.setTool(EditorTool.Paint);
    console.log('Default tool set to Paint');
    
    // Wire layer selector
    const layerSelect = this.editorUI.getLayerSelect();
    if (layerSelect) {
      this.updateLayerSelector();
      layerSelect.addEventListener('change', (e) => {
        const layerIndex = parseInt((e.target as HTMLSelectElement).value);
        this.editor.setActiveLayer(layerIndex);
      });
    }
    
    // Wire add layer button
    const addLayerBtn = this.editorUI.getAddLayerButton();
    if (addLayerBtn) {
      addLayerBtn.addEventListener('click', () => {
        const level = this.editor.getLevel();
        const newLayerName = `Layer ${level.tilemap.layers.length}`;
        level.tilemap.addLayer(newLayerName);
        this.updateLayerSelector();
      });
    }
    
    // Wire level name input
    const levelNameInput = this.editorUI.getLevelNameInput();
    if (levelNameInput) {
      levelNameInput.addEventListener('change', (e) => {
        const level = this.editor.getLevel();
        level.name = (e.target as HTMLInputElement).value;
      });
    }
    
    // Wire save button
    const saveBtn = this.editorUI.getSaveButton();
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const level = this.editor.getLevel();
        const levelName = level.name || 'Untitled Level';
        const levelData = this.editor.saveLevel();
        try {
          localStorage.setItem(`level_${levelName}`, levelData);
          alert(`Level "${levelName}" saved successfully!`);
        } catch (error) {
          console.error('Failed to save level:', error);
          alert('Failed to save level. Check console for details.');
        }
      });
    }
    
    // Wire load button
    const loadBtn = this.editorUI.getLoadButton();
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        this.showLoadDialog();
      });
    }
    
    this.setupEventListeners();
    this.start();
  }

  private showLoadDialog(): void {
    // Get all saved levels from localStorage
    const savedLevels: Array<{ name: string; key: string }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('level_')) {
        const name = key.replace('level_', '');
        savedLevels.push({ name, key });
      }
    }

    if (savedLevels.length === 0) {
      alert('No saved levels found.');
      return;
    }

    // Create simple dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2a2a2a;
      padding: 20px;
      border: 2px solid #444;
      border-radius: 4px;
      z-index: 10000;
      color: #fff;
    `;
    dialog.innerHTML = `
      <h3 style="margin-top: 0;">Load Level</h3>
      <select id="load-level-select" style="width: 100%; padding: 8px; margin-bottom: 10px; background: #1a1a1a; color: #fff; border: 1px solid #444;">
        ${savedLevels.map(level => `<option value="${level.key}">${level.name}</option>`).join('')}
      </select>
      <div style="display: flex; gap: 10px;">
        <button id="load-confirm" style="flex: 1; padding: 8px; background: #4a9eff; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Load</button>
        <button id="load-cancel" style="flex: 1; padding: 8px; background: #666; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
      </div>
    `;
    document.body.appendChild(dialog);

    const confirmBtn = dialog.querySelector('#load-confirm') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#load-cancel') as HTMLButtonElement;
    const select = dialog.querySelector('#load-level-select') as HTMLSelectElement;

    confirmBtn.addEventListener('click', () => {
      const selectedKey = select.value;
      const levelData = localStorage.getItem(selectedKey);
      if (levelData) {
        try {
          const levelJson = JSON.parse(levelData);
          const level = Level.fromJSON(levelJson);
          this.editor.loadLevel(level);
          
          // Update UI
          const levelNameInput = this.editorUI.getLevelNameInput();
          if (levelNameInput) {
            levelNameInput.value = level.name;
          }
          this.updateLayerSelector();
          
          alert(`Level "${level.name}" loaded successfully!`);
        } catch (error) {
          console.error('Failed to load level:', error);
          alert('Failed to load level. Check console for details.');
        }
      }
      document.body.removeChild(dialog);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }

  private updateLayerSelector(): void {
    const level = this.editor.getLevel();
    const layers = level.tilemap.layers.map((layer, index) => ({
      name: layer.name,
      index: index
    }));
    this.editorUI.updateLayerSelect(layers, this.editor.getActiveLayer());
  }

  private setupEventListeners(): void {
    // Update status bar
    const updateStatusBar = () => {
      const mousePos = Input.getMousePosition();
      this.editorUI.updateMousePosition(mousePos.x, mousePos.y);
      this.editorUI.updateActiveLayer(this.editor.getActiveLayer());
      this.editorUI.updateZoom(this.editor.getZoom());
    };

    // Keyboard shortcuts for tools
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with text input
      }
      
      if (e.key === '1') {
        this.editor.setTool(EditorTool.Select);
        this.editorUI.setTool(EditorTool.Select);
      } else if (e.key === '2') {
        this.editor.setTool(EditorTool.Paint);
        this.editorUI.setTool(EditorTool.Paint);
      } else if (e.key === '3') {
        this.editor.setTool(EditorTool.Erase);
        this.editorUI.setTool(EditorTool.Erase);
      } else if (e.key === '4') {
        this.editor.setTool(EditorTool.Entity);
        this.editorUI.setTool(EditorTool.Entity);
      }
    });

    // Control buttons
    const playBtn = document.getElementById('btn-play');
    const stopBtn = document.getElementById('btn-stop');
    const pauseBtn = document.getElementById('btn-pause');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.startRuntime();
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.stopRuntime();
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.togglePause();
      });
    }

    // Mouse wheel zoom
    const canvas = this.editorUI.getCanvas();
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const currentZoom = this.editor.getZoom();
      this.editor.setZoom(currentZoom * delta);
    });

    // Update loop for status bar
    setInterval(updateStatusBar, 100);
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    Time.init();
    console.log('Editor started, game loop running');
    this.gameLoop();
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    // Only run editor loop if not in runtime mode
    // Runtime mode uses Game's own loop
    if (!this.runtimeMode) {
      Time.update();
      Input.update();
      this.editor.update(Time.getDeltaTime());
      this.editor.render();
    }

    requestAnimationFrame(this.gameLoop);
  };

  private async startRuntime(): Promise<void> {
    if (this.runtimeMode) return;

    try {
      // Show loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'runtime-loading';
      loadingDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2a2a;
        padding: 20px;
        border: 2px solid #444;
        border-radius: 4px;
        z-index: 10000;
        color: #fff;
      `;
      loadingDiv.textContent = 'Loading assets...';
      document.body.appendChild(loadingDiv);

      // Get current level
      const level = this.editor.getLevel();

      // Preload assets
      await this.preloadAssets(level);

      // Remove loading indicator
      document.body.removeChild(loadingDiv);

      // Create runtime game instance
      const canvas = this.editorUI.getCanvas();
      this.runtimeGame = new Game(canvas);
      this.runtimeScene = new GameScene();
      this.runtimeScene.loadLevel(level);
      this.runtimeGame.setScene(this.runtimeScene);
      this.runtimeGame.start();

      this.runtimeMode = true;
    } catch (error) {
      console.error('Failed to start runtime:', error);
      alert('Failed to start runtime. Check console for details.');
      const loadingDiv = document.getElementById('runtime-loading');
      if (loadingDiv) {
        document.body.removeChild(loadingDiv);
      }
    }
  }

  private async preloadAssets(level: Level): Promise<void> {
    const { AssetLoader } = await import('../engine/AssetLoader');
    const assetsToLoad: Array<{ path: string; name: string }> = [];

    // Load tileset - check if already loaded, if not try to load from path
    if (level.tilemap.tilesetImage) {
      const existingImage = AssetLoader.getImage(level.tilemap.tilesetImage);
      if (!existingImage && level.tilemap.tilesetImage !== 'default-tileset') {
        // Try to load from assets folder
        const tilesetPath = level.tilemap.tilesetImage.startsWith('/') 
          ? level.tilemap.tilesetImage 
          : `/assets/${level.tilemap.tilesetImage}`;
        assetsToLoad.push({
          path: tilesetPath,
          name: level.tilemap.tilesetImage
        });
      }
    }

    // Load entity sprites (player, enemy, npc, item) - these are optional
    const entityTypes = ['player', 'enemy', 'npc', 'item'];
    for (const type of entityTypes) {
      // Only load if not already loaded
      if (!AssetLoader.getImage(type)) {
        assetsToLoad.push({
          path: `/assets/${type}.png`,
          name: type
        });
      }
    }

    // Load assets (failures are non-critical)
    const loadPromises = assetsToLoad.map(asset => {
      return AssetLoader.loadImage(asset.path, asset.name).catch(error => {
        console.warn(`Failed to load asset ${asset.name}:`, error);
        // Continue even if some assets fail - fallback rendering will be used
      });
    });

    await Promise.all(loadPromises);
  }

  private stopRuntime(): void {
    if (!this.runtimeMode) return;

    if (this.runtimeGame) {
      this.runtimeGame.stop();
      this.runtimeGame = null;
    }
    this.runtimeScene = null;
    this.runtimeMode = false;
  }

  private togglePause(): void {
    if (!this.runtimeMode || !this.runtimeGame) return;

    this.runtimeGame.togglePause();
  }
}

// Initialize editor when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EditorApp();
  });
} else {
  new EditorApp();
}

