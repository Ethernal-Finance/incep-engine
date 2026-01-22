import { Editor, EditorTool } from './Editor';
import { EditorUI } from './UI/EditorUI';
import { Input } from '../engine/Input';
import { Time } from '../engine/Time';
import { Level } from '../data/Level';
import { Game } from '../engine/Game';
import { GameScene } from '../runtime/GameScene';
import { Vector2 } from '../utils/Vector2';
import walkSpriteUrl from '../../assets/walk.png';

class EditorApp {
  private editor: Editor;
  private editorUI: EditorUI;
  private running: boolean = false;
  private runtimeMode: boolean = false;
  private runtimeGame: Game | null = null;
  private runtimeScene: GameScene | null = null;
  private lastSelectedEntityId: string | null = null;

  constructor() {
    const container = document.getElementById('editor-container');
    if (!container) {
      throw new Error('Editor container not found');
    }

    this.editorUI = new EditorUI(container);
    const canvas = this.editorUI.getCanvas();
    
    // Set canvas size
    const resizeCanvas = () => {
      const sidebar = document.querySelector('.editor-sidebar') as HTMLElement | null;
      const sidebarWidth = sidebar ? sidebar.getBoundingClientRect().width : 280;
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
    const sidebar = document.querySelector('.editor-sidebar') as HTMLElement | null;
    if (sidebar && 'ResizeObserver' in window) {
      const observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(sidebar);
    }

    this.editor = new Editor(canvas);
    
    // Connect tile selector to editor
    const tileSelector = this.editorUI.getTileSelector();
    tileSelector.setOnTileSelected((tileId) => {
      this.editor.getTilemapEditor().setSelectedTile(tileId);
    });
    tileSelector.setOnStampSelected((tileIds, width, height) => {
      this.editor.getTilemapEditor().setSelectedStamp(tileIds, width, height);
    });
    
    tileSelector.setOnTilesetChanged((info) => {
      // Update tilemap with new tileset info
      const level = this.editor.getLevel();
      level.tilemap.tilesetImage = info.path;
      level.tilemap.tilesetColumns = info.columns;
      level.tilemap.tilesetRows = info.rows;
      level.tilemap.tileSize = info.tileSize;
      this.editor.refreshTilemapMetrics();
    });
    
    // Wire tool buttons first
    this.editorUI.setOnToolChanged((tool) => {
      console.log(`Tool changed callback triggered: ${tool}`);
      this.editor.setTool(tool);
    });
    
    // Set default tool to Paint (this will also update the editor via callback)
    console.log('Setting default tool to Paint...');
    this.editorUI.setTool(EditorTool.Paint);
    console.log('Default tool set to Paint');
    
    // Wire layer selector
    this.updateLayerSelector();
    this.editorUI.setOnLayerSelected((layerIndex) => {
      this.editor.setActiveLayer(layerIndex);
      this.updateLayerSelector();
    });
    this.editorUI.setOnLayerVisibilityChanged((layerIndex, visible) => {
      const level = this.editor.getLevel();
      const layer = level.tilemap.layers[layerIndex];
      if (layer) {
        layer.visible = visible;
      }
    });
    
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

    // Wire rename layer button
    const renameLayerBtn = this.editorUI.getRenameLayerButton();
    if (renameLayerBtn) {
      renameLayerBtn.addEventListener('click', () => {
        const level = this.editor.getLevel();
        const activeIndex = this.editor.getActiveLayer();
        const activeLayer = level.tilemap.layers[activeIndex];
        if (!activeLayer) return;
        const newName = prompt('Rename layer', activeLayer.name);
        if (!newName) return;
        activeLayer.name = newName;
        this.updateLayerSelector();
      });
    }
    
    // Wire level name input
    const levelNameInput = this.editorUI.getLevelNameInput();
    if (levelNameInput) {
      levelNameInput.addEventListener('change', (e) => {
        const level = this.editor.getLevel();
        level.name = (e.target as HTMLInputElement).value;
        this.editorUI.updateLayersTitle(level.name);
      });
    }

    const backgroundSoundInput = this.editorUI.getBackgroundSoundInput();
    if (backgroundSoundInput) {
      backgroundSoundInput.addEventListener('change', (e) => {
        const level = this.editor.getLevel();
        const value = (e.target as HTMLInputElement).value.trim();
        level.backgroundSound = value.length > 0 ? value : null;
      });
    }

    const collisionSoundInput = this.editorUI.getEntityCollisionSoundInput();
    if (collisionSoundInput) {
      collisionSoundInput.addEventListener('change', (e) => {
        this.updateSelectedEntitySound('soundOnCollision', (e.target as HTMLInputElement).value);
      });
    }

    const interactSoundInput = this.editorUI.getEntityInteractSoundInput();
    if (interactSoundInput) {
      interactSoundInput.addEventListener('change', (e) => {
        this.updateSelectedEntitySound('soundOnInteract', (e.target as HTMLInputElement).value);
      });
    }

    this.setupEntityPanel();
    
    // Wire save button
    const saveBtn = this.editorUI.getSaveButton();
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const level = this.editor.getLevel();
        const levelName = level.name || 'Untitled Level';
        const levelData = this.editor.saveLevel();
        try {
          try {
            await this.saveLevelToServer(levelName, levelData);
          } catch (error) {
            console.warn('Failed to save level to server, falling back to download.', error);
            this.downloadLevel(levelName, levelData);
          }
          this.registerLevel(levelName, levelData);
          alert(`Level "${levelName}" saved to JSON.`);
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
        this.loadLevelFromFile();
      });
    }
    
    this.setupEventListeners();
    this.start();
  }

  private loadLevelFromFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const levelJson = JSON.parse(String(reader.result || ''));
          const level = Level.fromJSON(levelJson);
          this.editor.loadLevel(level);

          const levelNameInput = this.editorUI.getLevelNameInput();
          if (levelNameInput) {
            levelNameInput.value = level.name;
          }
          this.editorUI.updateLayersTitle(level.name);
          this.updateLayerSelector();
          this.syncAudioPanel();

          const levelData = JSON.stringify(levelJson, null, 2);
          this.registerLevel(level.name, levelData);
          alert(`Level "${level.name}" loaded successfully!`);
        } catch (error) {
          console.error('Failed to load level:', error);
          alert('Failed to load level. Check console for details.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private downloadLevel(levelName: string, levelData: string): void {
    const safeName = levelName.replace(/[^\w\-]+/g, '_').toLowerCase();
    const fileName = `${safeName || 'level'}.json`;
    const blob = new Blob([levelData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private async saveLevelToServer(levelName: string, levelData: string): Promise<void> {
    const response = await fetch('/api/levels/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: levelName, data: levelData })
    });
    if (!response.ok) {
      throw new Error(`Failed to save level: HTTP ${response.status}`);
    }
  }

  private getLevelStore(): Map<string, string> {
    const win = window as unknown as { __levelStore?: Map<string, string> };
    if (!win.__levelStore) {
      win.__levelStore = new Map();
    }
    return win.__levelStore;
  }

  private registerLevel(name: string, data: string): void {
    this.getLevelStore().set(name, data);
  }

  private updateLayerSelector(): void {
    const level = this.editor.getLevel();
    const layers = level.tilemap.layers.map((layer, index) => ({
      name: layer.name,
      index: index,
      visible: layer.visible
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
      this.syncAudioPanel();
      this.syncEntityPanel();
    };

    // Keyboard shortcuts for tools
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with text input
      }
      
      // Tool shortcuts
      if (e.key === '1') {
        this.editorUI.setTool(EditorTool.Select);
      } else if (e.key === '2') {
        this.editorUI.setTool(EditorTool.Paint);
      } else if (e.key === '3') {
        this.editorUI.setTool(EditorTool.Erase);
      } else if (e.key === '4') {
        this.editorUI.setTool(EditorTool.Entity);
      } else if (e.key === '5') {
        this.editorUI.setTool(EditorTool.Collision);
      } else if (e.key === 'B' && !e.shiftKey) {
        this.editorUI.setTool(EditorTool.Brush);
      } else if (e.key === 'F') {
        this.editorUI.setTool(EditorTool.FloodFill);
      } else if (e.key === 'L') {
        this.editorUI.setTool(EditorTool.Line);
      } else if (e.key === 'I' || (e.key === 'D' && e.altKey)) {
        this.editorUI.setTool(EditorTool.Eyedropper);
      } else if (e.key === '6') {
        this.editorUI.setTool(EditorTool.Spawn);
      } else if (e.key === '7') {
        this.editorUI.setTool(EditorTool.Door);
      }
      
      // Undo/Redo
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          this.editor.getUndoSystem().redo();
        } else {
          this.editor.getUndoSystem().undo();
        }
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        this.editor.getSelectionSystem().clearSelection();
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

    // Mouse wheel zoom (centered on cursor)
    const canvas = this.editorUI.getCanvas();
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const viewControls = this.editor.getViewControls();
      const mousePos = Input.getMousePosition();
      const viewportWidth = canvas.width;
      const viewportHeight = canvas.height;
      const gridOffset = this.editor.getGridOffset();
      const currentZoom = this.editor.getZoom();
      
      const result = viewControls.zoomAtPoint(currentZoom, e.deltaY, mousePos, viewportWidth, viewportHeight, gridOffset);
      this.editor.setZoom(result.newZoom);
      this.editor.setGridOffset(result.newOffset);
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
      this.editor.update(Time.getDeltaTime());
      this.editor.render();
      // Clear per-frame input after the editor consumes it.
      Input.update();
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
    const { AudioManager } = await import('../engine/AudioManager');
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

    if (!AssetLoader.getImage('walk')) {
      assetsToLoad.push({
        path: walkSpriteUrl,
        name: 'walk'
      });
    }

    // Load assets (failures are non-critical)
    const loadPromises = assetsToLoad.map(asset => {
      return AssetLoader.loadImage(asset.path, asset.name).catch(error => {
        console.warn(`Failed to load asset ${asset.name}:`, error);
        // Continue even if some assets fail - fallback rendering will be used
      });
    });

    await Promise.all(loadPromises);

    const soundRefs = new Set<string>();
    if (level.backgroundSound) {
      soundRefs.add(level.backgroundSound);
    }
    for (const entity of level.entities) {
      const properties = entity.properties || {};
      if (typeof properties.soundOnCollision === 'string') {
        soundRefs.add(properties.soundOnCollision);
      }
      if (typeof properties.soundOnInteract === 'string') {
        soundRefs.add(properties.soundOnInteract);
      }
    }

    const soundPromises = Array.from(soundRefs).map((soundRef) => {
      const trimmed = soundRef.trim();
      if (!trimmed) return Promise.resolve();
      const path = AudioManager.resolvePath(trimmed);
      return AudioManager.loadSound(path, trimmed).catch((error) => {
        console.warn(`Failed to load sound ${trimmed}:`, error);
      });
    });

    await Promise.all(soundPromises);
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

  private updateSelectedEntitySound(key: 'soundOnCollision' | 'soundOnInteract', value: string): void {
    const entity = this.editor.getSelectedEntity();
    if (!entity) return;
    const trimmed = value.trim();
    if (!entity.properties) {
      entity.properties = {};
    }
    if (trimmed.length === 0) {
      delete entity.properties[key];
    } else {
      entity.properties[key] = trimmed;
    }
  }

  private syncAudioPanel(): void {
    const level = this.editor.getLevel();
    const backgroundInput = this.editorUI.getBackgroundSoundInput();
    if (backgroundInput && document.activeElement !== backgroundInput) {
      const desired = level.backgroundSound || '';
      if (backgroundInput.value !== desired) {
        backgroundInput.value = desired;
      }
    }

    const selectedEntity = this.editor.getSelectedEntity();
    const selectedId = selectedEntity?.id ?? null;
    const collisionInput = this.editorUI.getEntityCollisionSoundInput();
    const interactInput = this.editorUI.getEntityInteractSoundInput();
    if (!collisionInput || !interactInput) return;

    const inputsDisabled = !selectedEntity;
    if (collisionInput.disabled !== inputsDisabled) {
      collisionInput.disabled = inputsDisabled;
    }
    if (interactInput.disabled !== inputsDisabled) {
      interactInput.disabled = inputsDisabled;
    }

    if (selectedId !== this.lastSelectedEntityId) {
      const props = selectedEntity?.properties || {};
      const collisionValue = typeof props.soundOnCollision === 'string' ? props.soundOnCollision : '';
      const interactValue = typeof props.soundOnInteract === 'string' ? props.soundOnInteract : '';
      if (document.activeElement !== collisionInput) {
        collisionInput.value = collisionValue;
      }
      if (document.activeElement !== interactInput) {
        interactInput.value = interactValue;
      }
      this.lastSelectedEntityId = selectedId;
    }
  }

  private setupEntityPanel(): void {
    const typeSelect = this.editorUI.getEntityTypeSelect();
    const customInput = this.editorUI.getEntityCustomTypeInput();
    const snapToggle = this.editorUI.getEntitySnapToggle();

    const syncType = () => {
      const nextType = this.getSelectedEntityTypeFromUI();
      this.editor.setSelectedEntityType(nextType);
      if (customInput && typeSelect) {
        const isCustom = typeSelect.value === 'custom';
        customInput.disabled = !isCustom;
        if (!isCustom) {
          customInput.value = '';
        }
      }
    };

    if (typeSelect) {
      typeSelect.addEventListener('change', syncType);
    }

    if (customInput) {
      customInput.addEventListener('input', () => {
        if (typeSelect && typeSelect.value === 'custom') {
          this.editor.setSelectedEntityType(this.getSelectedEntityTypeFromUI());
        }
      });
    }

    if (snapToggle) {
      snapToggle.addEventListener('change', (e) => {
        this.editor.setEntitySnapToGrid((e.target as HTMLInputElement).checked);
      });
      snapToggle.checked = this.editor.getEntitySnapToGrid();
    }

    syncType();
  }

  private getSelectedEntityTypeFromUI(): string {
    const typeSelect = this.editorUI.getEntityTypeSelect();
    const customInput = this.editorUI.getEntityCustomTypeInput();
    if (!typeSelect) {
      return this.editor.getSelectedEntityType();
    }

    if (typeSelect.value === 'custom') {
      const customValue = customInput?.value.trim() ?? '';
      return customValue.length > 0 ? customValue : 'entity';
    }

    return typeSelect.value;
  }

  private syncEntityPanel(): void {
    const typeSelect = this.editorUI.getEntityTypeSelect();
    const customInput = this.editorUI.getEntityCustomTypeInput();
    const snapToggle = this.editorUI.getEntitySnapToggle();
    if (!typeSelect || !customInput || !snapToggle) return;

    const selectedEntity = this.editor.getSelectedEntity();
    const activeType = selectedEntity?.type ?? this.editor.getSelectedEntityType();
    const knownTypes = new Set(['player', 'enemy', 'npc', 'item']);
    const activeElement = document.activeElement;
    const isEditingType = activeElement === typeSelect || activeElement === customInput;

    if (!isEditingType) {
      if (knownTypes.has(activeType)) {
        if (typeSelect.value !== activeType) {
          typeSelect.value = activeType;
        }
        if (!customInput.disabled) {
          customInput.disabled = true;
        }
        if (customInput.value) {
          customInput.value = '';
        }
      } else {
        if (typeSelect.value !== 'custom') {
          typeSelect.value = 'custom';
        }
        if (customInput.disabled) {
          customInput.disabled = false;
        }
        if (customInput.value !== activeType) {
          customInput.value = activeType;
        }
      }
    }

    const desiredSnap = this.editor.getEntitySnapToGrid();
    if (snapToggle.checked !== desiredSnap) {
      snapToggle.checked = desiredSnap;
    }
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
