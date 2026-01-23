import { Editor, EditorTool } from './Editor';
import { EditorUI } from './UI/EditorUI';
import { Input } from '../engine/Input';
import { Time } from '../engine/Time';
import { Level, LevelEntity } from '../data/Level';
import { Game } from '../engine/Game';
import { GameScene } from '../runtime/GameScene';
import { Vector2 } from '../utils/Vector2';
import walkSpriteUrl from '../../assets/walk.png';

const enemyAssetImports = import.meta.glob('../../assets/Enemy/*.png', {
  eager: true,
  import: 'default'
}) as Record<string, string>;

const enemyAssetOptions = Object.entries(enemyAssetImports)
  .map(([path, url]) => {
    const fileName = path.split('/').pop() ?? 'enemy';
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    return {
      key: `enemy:${baseName}`,
      label: baseName,
      url
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

const enemyAssetKeyByLabel = new Map(
  enemyAssetOptions.map((asset) => [asset.label.toLowerCase(), asset.key])
);

const enemyAssetUrlMap = new Map(enemyAssetOptions.map((asset) => [asset.key, asset.url]));

const normalizeEnemySpriteKey = (raw: string | null | undefined): string | null => {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;
  const exact = enemyAssetOptions.find((asset) => asset.key === trimmed);
  if (exact) return exact.key;

  const withoutPath = trimmed.split('/').pop() ?? trimmed;
  const baseName = withoutPath.replace(/\.[^/.]+$/, '');
  const lower = baseName.toLowerCase();
  if (enemyAssetKeyByLabel.has(lower)) {
    return enemyAssetKeyByLabel.get(lower) ?? null;
  }

  if (trimmed.startsWith('enemy:')) {
    const fallback = trimmed.slice('enemy:'.length).trim();
    const fallbackLower = fallback.toLowerCase();
    return enemyAssetKeyByLabel.get(fallbackLower) ?? trimmed;
  }

  return trimmed;
};

const enemyAIOptions = [
  { value: 'idle', label: 'Idle' },
  { value: 'wander', label: 'Wander' },
  { value: 'patrol-horizontal', label: 'Patrol Horizontal' },
  { value: 'patrol-vertical', label: 'Patrol Vertical' },
  { value: 'chase-player', label: 'Chase Player' }
];

class EditorApp {
  private editor: Editor;
  private editorUI: EditorUI;
  private running: boolean = false;
  private runtimeMode: boolean = false;
  private runtimeGame: Game | null = null;
  private runtimeScene: GameScene | null = null;
  private lastSelectedEntityId: string | null = null;
  private enemyAssets = enemyAssetOptions;
  private openTabs: Map<string, { name: string; data: string }> = new Map();
  private activeTabId: string | null = null;
  private nextTabId = 1;

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
      // Only update the active paint tileset (tiles can mix per map)
      const level = this.editor.getLevel();
      if (info.tileSize !== level.tilemap.tileSize) {
        console.warn(
          `Tileset tileSize (${info.tileSize}) differs from map tileSize (${level.tilemap.tileSize}).` +
          ' Mixed tile sizes are not supported; painting will use the map tile size.'
        );
      }
      this.editor.getTilemapEditor().setSelectedTileset(info.path);
    });
    
    // Wire tool buttons first
    this.editorUI.setOnToolChanged((tool) => {
      console.log(`Tool changed callback triggered: ${tool}`);
      this.editor.setTool(tool);
      this.updateToolPanelVisibility();
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
        if (this.activeTabId) {
          this.editorUI.updateTabLabel(this.activeTabId, level.name);
          const tab = this.openTabs.get(this.activeTabId);
          if (tab) {
            tab.name = level.name;
          }
        }
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
          this.persistActiveTab();
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
    
    this.setupTabs();
    this.updateToolPanelVisibility();
    this.setupEventListeners();
    this.start();
  }

  private updateToolPanelVisibility(): void {
    const tool = this.editor.getTool();
    const entityPanel = this.editorUI.getEntityPanel();
    const audioPanel = this.editorUI.getEntityAudioPanel();
    const entityAudioSubsection = this.editorUI.getEntityAudioSubsection();
    const backgroundAudioSubsection = this.editorUI.getBackgroundAudioSubsection();
    const tilemapPanel = this.editorUI.getTilemapPanel();

    const isEntityTool = tool === EditorTool.Entity;
    const isBackgroundAudioTool = tool === EditorTool.BackgroundAudio;
    const isTileTool = [
      EditorTool.Paint,
      EditorTool.Erase,
      EditorTool.Collision,
      EditorTool.Brush,
      EditorTool.FloodFill,
      EditorTool.Line,
      EditorTool.Rectangle,
      EditorTool.Eyedropper
    ].includes(tool);

    if (entityPanel) {
      entityPanel.classList.toggle('is-hidden', !isEntityTool);
    }
    if (tilemapPanel) {
      tilemapPanel.classList.toggle('is-hidden', !isTileTool);
    }
    if (audioPanel) {
      audioPanel.classList.toggle('is-hidden', !isEntityTool && !isBackgroundAudioTool);
    }
    if (entityAudioSubsection) {
      entityAudioSubsection.classList.toggle('is-hidden', !isEntityTool);
    }
    if (backgroundAudioSubsection) {
      backgroundAudioSubsection.classList.toggle('is-hidden', !isBackgroundAudioTool);
    }
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
          const levelData = JSON.stringify(levelJson, null, 2);
          this.openTabFromData(levelData, true);
          alert(`Level "${levelJson.name || 'Untitled Level'}" loaded successfully!`);
        } catch (error) {
          console.error('Failed to load level:', error);
          alert('Failed to load level. Check console for details.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private setupTabs(): void {
    const levelData = this.editor.saveLevel();
    this.openTabFromData(levelData, true);
    this.editorUI.setOnTabSelected((tabId) => this.activateTab(tabId));
    this.editorUI.setOnTabClosed((tabId) => this.closeTab(tabId));
  }

  private openTabFromData(levelData: string, makeActive: boolean): void {
    const tabId = `tab_${this.nextTabId++}`;
    let level: Level;
    try {
      const levelJson = JSON.parse(levelData);
      level = Level.fromJSON(levelJson);
    } catch {
      level = new Level('Untitled Level');
      levelData = this.editor.saveLevel();
    }
    this.openTabs.set(tabId, { name: level.name, data: levelData });
    this.editorUI.addTab(level.name || 'Untitled', tabId, makeActive);
    if (makeActive) {
      this.activateTab(tabId);
    }
  }

  private activateTab(tabId: string): void {
    if (this.activeTabId === tabId) return;
    this.persistActiveTab();

    const tab = this.openTabs.get(tabId);
    if (!tab) return;
    const levelJson = JSON.parse(tab.data);
    const level = Level.fromJSON(levelJson);
    this.editor.loadLevel(level);
    this.syncTilesetSelector(level);

    const levelNameInput = this.editorUI.getLevelNameInput();
    if (levelNameInput) {
      levelNameInput.value = level.name;
    }
    this.editorUI.updateLayersTitle(level.name);
    this.updateLayerSelector();
    this.syncAudioPanel();
    this.syncEntityPanel();

    this.activeTabId = tabId;
    this.editorUI.setActiveTab(tabId);
  }

  private closeTab(tabId: string): void {
    if (!this.openTabs.has(tabId)) return;
    if (this.openTabs.size === 1) {
      return;
    }
    const isActive = this.activeTabId === tabId;
    this.openTabs.delete(tabId);
    this.editorUI.removeTab(tabId);
    if (isActive) {
      const nextTabId = this.openTabs.keys().next().value as string | undefined;
      if (nextTabId) {
        this.activateTab(nextTabId);
      }
    }
  }

  private persistActiveTab(): void {
    if (!this.activeTabId) return;
    const tab = this.openTabs.get(this.activeTabId);
    if (!tab) return;
    const level = this.editor.getLevel();
    tab.name = level.name;
    tab.data = this.editor.saveLevel();
    this.editorUI.updateTabLabel(this.activeTabId, level.name || 'Untitled');
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

  private syncTilesetSelector(level: Level): void {
    const tilesetName = level.tilemap.tilesetImage || 'default-tileset';
    this.editorUI.getTileSelector().syncTileset(tilesetName);
    this.editor.getTilemapEditor().setSelectedTileset(tilesetName);
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
      } else if (e.key === '8') {
        this.editorUI.setTool(EditorTool.BackgroundAudio);
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

    const enemySpriteKeys = new Set<string>();
    for (const entity of level.entities) {
      if (entity.type !== 'enemy') continue;
      const spriteKey = normalizeEnemySpriteKey(
        typeof entity.properties?.enemySprite === 'string'
          ? entity.properties.enemySprite
          : ''
      );
      if (spriteKey) {
        enemySpriteKeys.add(spriteKey);
      }
    }

    for (const spriteKey of enemySpriteKeys) {
      if (!AssetLoader.getImage(spriteKey)) {
        const url = enemyAssetUrlMap.get(spriteKey);
        if (url) {
          assetsToLoad.push({
            path: url,
            name: spriteKey
          });
        }
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
    const enemySelect = this.editorUI.getEnemyAssetSelect();
    const enemyAISelect = this.editorUI.getEnemyAISelect();

    const syncType = () => {
      const nextType = this.getSelectedEntityTypeFromUI();
      this.editor.setSelectedEntityType(nextType);
      this.updateEnemyControlsVisibility(nextType);
      if (customInput && typeSelect) {
        const isCustom = typeSelect.value === 'custom';
        customInput.disabled = !isCustom;
        if (!isCustom) {
          customInput.value = '';
        }
      }
      if (nextType === 'enemy') {
        const selectedSprite = this.getSelectedEnemySpriteFromUI();
        this.editor.setSelectedEnemySprite(selectedSprite);
        const selectedEntity = this.editor.getSelectedEntity();
        if (selectedEntity && selectedEntity.type === 'enemy') {
          this.applyEnemySpriteToEntity(selectedEntity, selectedSprite);
        }
        const selectedAI = this.getSelectedEnemyAIFromUI();
        this.editor.setSelectedEnemyAI(selectedAI);
        if (selectedEntity && selectedEntity.type === 'enemy') {
          this.applyEnemyAIToEntity(selectedEntity, selectedAI);
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

    if (enemySelect) {
      this.populateEnemyAssetSelect(enemySelect);
      enemySelect.addEventListener('change', () => {
        const selectedSprite = this.getSelectedEnemySpriteFromUI();
        this.editor.setSelectedEnemySprite(selectedSprite);
        const selectedEntity = this.editor.getSelectedEntity();
        if (selectedEntity && selectedEntity.type === 'enemy') {
          this.applyEnemySpriteToEntity(selectedEntity, selectedSprite);
        }
      });
    }

    if (enemyAISelect) {
      this.populateEnemyAISelect(enemyAISelect);
      enemyAISelect.addEventListener('change', () => {
        const selectedAI = this.getSelectedEnemyAIFromUI();
        this.editor.setSelectedEnemyAI(selectedAI);
        const selectedEntity = this.editor.getSelectedEntity();
        if (selectedEntity && selectedEntity.type === 'enemy') {
          this.applyEnemyAIToEntity(selectedEntity, selectedAI);
        }
      });
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

  private getSelectedEnemySpriteFromUI(): string | null {
    const enemySelect = this.editorUI.getEnemyAssetSelect();
    if (!enemySelect) {
      return this.editor.getSelectedEnemySprite();
    }
    const value = enemySelect.value.trim();
    return normalizeEnemySpriteKey(value.length > 0 ? value : null);
  }

  private populateEnemyAssetSelect(select: HTMLSelectElement): void {
    select.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Default';
    select.appendChild(defaultOption);

    this.enemyAssets.forEach((asset) => {
      const option = document.createElement('option');
      option.value = asset.key;
      option.textContent = asset.label;
      select.appendChild(option);
    });
  }

  private getSelectedEnemyAIFromUI(): string | null {
    const enemyAISelect = this.editorUI.getEnemyAISelect();
    if (!enemyAISelect) {
      return this.editor.getSelectedEnemyAI();
    }
    const value = enemyAISelect.value.trim();
    return value.length > 0 ? value : null;
  }

  private populateEnemyAISelect(select: HTMLSelectElement): void {
    select.innerHTML = '';
    enemyAIOptions.forEach((option) => {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      select.appendChild(element);
    });
  }

  private updateEnemyControlsVisibility(activeType: string): void {
    const assetRow = this.editorUI.getEnemyAssetRow();
    if (assetRow) {
      assetRow.hidden = activeType !== 'enemy';
    }
    const aiRow = this.editorUI.getEnemyAIRow();
    if (aiRow) {
      aiRow.hidden = activeType !== 'enemy';
    }
  }

  private applyEnemyAIToEntity(entity: LevelEntity, mode: string | null): void {
    if (!entity) return;
    const trimmed = mode?.trim() ?? '';
    if (!trimmed) {
      if (entity.properties && 'enemyAI' in entity.properties) {
        delete entity.properties.enemyAI;
        if (Object.keys(entity.properties).length === 0) {
          delete entity.properties;
        }
      }
      return;
    }
    if (!entity.properties) {
      entity.properties = {};
    }
    entity.properties.enemyAI = trimmed;
  }

  private applyEnemySpriteToEntity(entity: LevelEntity, spriteKey: string | null): void {
    if (!entity) return;
    const normalized = normalizeEnemySpriteKey(spriteKey);
    if (!normalized) {
      if (entity.properties && 'enemySprite' in entity.properties) {
        delete entity.properties.enemySprite;
        if (Object.keys(entity.properties).length === 0) {
          delete entity.properties;
        }
      }
      return;
    }
    if (!entity.properties) {
      entity.properties = {};
    }
    entity.properties.enemySprite = normalized;
  }

  private syncEntityPanel(): void {
    const typeSelect = this.editorUI.getEntityTypeSelect();
    const customInput = this.editorUI.getEntityCustomTypeInput();
    const snapToggle = this.editorUI.getEntitySnapToggle();
    const enemySelect = this.editorUI.getEnemyAssetSelect();
    const enemyAISelect = this.editorUI.getEnemyAISelect();
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

    this.updateEnemyControlsVisibility(activeType);

    if (enemySelect) {
      const isEditingEnemy = activeElement === enemySelect;
      if (!isEditingEnemy) {
        const rawSprite = typeof selectedEntity?.properties?.enemySprite === 'string'
          ? selectedEntity.properties.enemySprite
          : this.editor.getSelectedEnemySprite();
        const normalizedKey = normalizeEnemySpriteKey(rawSprite);
        const desiredValue = normalizedKey ?? '';
        if (enemySelect.value !== desiredValue) {
          enemySelect.value = desiredValue;
        }
        if (this.editor.getSelectedEnemySprite() !== normalizedKey) {
          this.editor.setSelectedEnemySprite(normalizedKey);
        }
        if (selectedEntity && selectedEntity.type === 'enemy') {
          this.applyEnemySpriteToEntity(selectedEntity, normalizedKey);
        }
      }
    }

    if (enemyAISelect) {
      const isEditingAI = activeElement === enemyAISelect;
      if (!isEditingAI) {
        const desiredAI = typeof selectedEntity?.properties?.enemyAI === 'string'
          ? selectedEntity.properties.enemyAI
          : this.editor.getSelectedEnemyAI();
        const normalized = desiredAI?.trim() ?? '';
        if (enemyAISelect.value !== normalized) {
          enemyAISelect.value = normalized;
        }
        if (this.editor.getSelectedEnemyAI() !== (normalized.length > 0 ? normalized : null)) {
          this.editor.setSelectedEnemyAI(normalized.length > 0 ? normalized : null);
        }
        if (selectedEntity && selectedEntity.type === 'enemy') {
          this.applyEnemyAIToEntity(selectedEntity, normalized.length > 0 ? normalized : null);
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
