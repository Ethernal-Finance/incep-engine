import { TileSelector } from './TileSelector';
import { EditorTool } from '../Editor';

export class EditorUI {
  private container: HTMLElement;
  private topBar!: HTMLElement;
  private canvasContainer!: HTMLElement;
  private sidebar!: HTMLElement;
  private statusBar!: HTMLElement;
  private tabs!: HTMLElement;
  private tileSelector!: TileSelector;
  private toolButtons: Map<EditorTool, HTMLButtonElement> = new Map();
  private onToolChanged?: (tool: EditorTool) => void;
  private onLayerSelected?: (layerIndex: number) => void;
  private onLayerVisibilityChanged?: (layerIndex: number, visible: boolean) => void;
  private onTabSelected?: (tabId: string) => void;
  private onTabClosed?: (tabId: string) => void;
  private readonly minSidebarWidth = 200;
  private readonly maxSidebarWidth = 520;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupUI();
  }

  private setupUI(): void {
    // Top bar
    this.topBar = document.createElement('div');
    this.topBar.className = 'editor-top-bar';
    this.topBar.innerHTML = `
      <div class="top-bar-left">
        <button class="btn-menu">Menu</button>
        <div class="control-buttons">
          <button class="btn-control" id="btn-undo" title="Undo">↶</button>
          <button class="btn-control" id="btn-redo" title="Redo">↷</button>
          <button class="btn-control" id="btn-play" title="Play">▶</button>
          <button class="btn-control" id="btn-stop" title="Stop">■</button>
          <button class="btn-control" id="btn-pause" title="Pause">⏸</button>
        </div>
        <div class="tabs-container" id="tabs-container"></div>
      </div>
      <div class="top-bar-right">
        <div class="top-bar-level-controls">
          <input type="text" class="level-name-input" id="level-name-input" placeholder="Level name" value="Layout 1">
          <button class="btn-small" id="btn-save">Save</button>
          <button class="btn-small" id="btn-load">Load</button>
        </div>
      </div>
    `;

    // Canvas container
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'editor-canvas-container';
    this.canvasContainer.innerHTML = '<canvas id="editor-canvas"></canvas>';

    // Sidebar
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'editor-sidebar';
    this.sidebar.innerHTML = `
      <div class="sidebar-section">
        <h3>Tools</h3>
        <div class="tool-buttons">
          <button class="tool-btn active" id="tool-select" title="Select (1)">
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M4 3l10 6-4 1 2.5 6-2 1-2.5-6-4 4z"></path>
              </svg>
            </span>
            <span class="tool-label">Select</span>
          </button>
          <button class="tool-btn" id="tool-paint" title="Paint (2)">
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M13.5 3.5l3 3-7.5 7.5-3.5 1 1-3.5z"></path>
                <path d="M6 14.5c-2 0-3.5 1.4-3.5 3.2 0 1.3 1 2.3 2.4 2.3 2 0 3.6-1.4 3.6-3.2 0-1.3-1-2.3-2.5-2.3z"></path>
              </svg>
            </span>
            <span class="tool-label">Paint</span>
          </button>
          <button class="tool-btn" id="tool-erase" title="Erase (3)">
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M4 12l6-6 6 6-4 4H8l-4-4z"></path>
                <path d="M8 16h6"></path>
              </svg>
            </span>
            <span class="tool-label">Erase</span>
          </button>
          <button class="tool-btn" id="tool-entity" title="Entity (4)">
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M4 7l6-3 6 3v6l-6 3-6-3z"></path>
                <path d="M10 4v12"></path>
                <path d="M4 7l6 3 6-3"></path>
              </svg>
            </span>
            <span class="tool-label">Entity</span>
          </button>
          <button class="tool-btn" id="tool-collision" title="Collision (5)">
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="6"></circle>
                <path d="M10 3v4M10 13v4M3 10h4M13 10h4"></path>
              </svg>
            </span>
            <span class="tool-label">Collision</span>
          </button>
          <button class="tool-btn" id="tool-spawn" title="Spawn (6)">
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="6"></circle>
                <path d="M10 7v6M7 10h6"></path>
              </svg>
            </span>
            <span class="tool-label">Spawn</span>
          </button>
          <button class="tool-btn" id="tool-door" title="Door (7)">
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <rect x="5" y="3" width="10" height="14" rx="1"></rect>
                <circle cx="12.5" cy="10" r="1"></circle>
              </svg>
            </span>
            <span class="tool-label">Door</span>
          </button>
          <button class="tool-btn" id="tool-background-audio" title="Background Audio (8)">
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <path d="M4 8v4h3l4 3V5L7 8H4z"></path>
                <path d="M14 8c1 .7 1 2.3 0 3"></path>
                <path d="M16 6c2 1.6 2 6.4 0 8"></path>
              </svg>
            </span>
            <span class="tool-label">BG Audio</span>
          </button>
        </div>
      </div>
      <div class="sidebar-section entity-panel" id="entity-panel">
        <h3>Entity</h3>
        <label class="field-label" for="entity-type-select">Type</label>
        <select class="select-input" id="entity-type-select">
          <option value="player">Player</option>
          <option value="enemy">Enemy</option>
          <option value="npc">NPC</option>
          <option value="item">Item</option>
          <option value="custom">Custom</option>
        </select>
        <input type="text" class="search-input" id="entity-type-custom" placeholder="Custom type name" disabled>
        <div class="enemy-asset-row" id="enemy-asset-row" hidden>
          <label class="field-label" for="enemy-asset-select">Enemy</label>
          <select class="select-input" id="enemy-asset-select"></select>
        </div>
        <div class="enemy-ai-row" id="enemy-ai-row" hidden>
          <label class="field-label" for="enemy-ai-select">Enemy AI</label>
          <select class="select-input" id="enemy-ai-select"></select>
        </div>
        <label class="toggle-row" for="entity-snap-grid">
          <input type="checkbox" id="entity-snap-grid" checked>
          <span>Snap to grid</span>
        </label>
        <div class="entity-hint">Alt + drag to duplicate. Delete to remove.</div>
      </div>
      <div class="sidebar-section" id="entity-audio-panel">
        <h3>Audio</h3>
        <div class="audio-subsection" id="level-audio-subsection">
          <label class="field-label" for="level-bg-sound">Background</label>
          <input type="text" class="search-input" id="level-bg-sound" placeholder="e.g. ambience.mp3">
        </div>
        <div class="audio-subsection" id="entity-audio-subsection">
          <div class="audio-subtitle">Selected entity</div>
          <label class="field-label" for="entity-sound-collision">On collision</label>
          <input type="text" class="search-input" id="entity-sound-collision" placeholder="e.g. hit.wav">
          <label class="field-label" for="entity-sound-interact">On interact (E)</label>
          <input type="text" class="search-input" id="entity-sound-interact" placeholder="e.g. talk.mp3">
          <div class="audio-hint">Select with Entity tool to edit.</div>
        </div>
      </div>
      <div class="sidebar-section">
        <h3>Assets</h3>
        <input type="text" class="search-input" placeholder="Search assets...">
      </div>
      <div class="sidebar-section tilemap-panel">
        <div class="panel-tabs" role="tablist" aria-label="Tilemap panels">
          <button class="panel-tab active" role="tab" aria-selected="true" data-panel="tilemap">Tilemap</button>
          <button class="panel-tab" role="tab" aria-selected="false" data-panel="layers">Layers</button>
        </div>
        <div class="panel-content active" data-panel="tilemap" role="tabpanel">
          <h3>Tile Selector</h3>
          <select class="tileset-select" id="tileset-select">
            <option>Select a tileset...</option>
          </select>
          <div class="tile-zoom">
            <label for="tile-zoom-range">Zoom</label>
            <input type="range" id="tile-zoom-range" min="50" max="200" value="100">
          </div>
          <div class="tile-preview" id="tile-preview"></div>
          <div class="tile-info">No tile selected</div>
        </div>
        <div class="panel-content" data-panel="layers" role="tabpanel" aria-hidden="true">
          <div class="layers-title">
            <span>Layers - </span>
            <span id="layers-level-name">Layout 1</span>
          </div>
          <ul class="layer-list" id="layer-list"></ul>
          <div class="layer-buttons">
            <button class="btn-small" id="btn-add-layer">Add Layer</button>
            <button class="btn-small" id="btn-rename-layer">Rename Layer</button>
          </div>
        </div>
      </div>
    `;

    // Status bar
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'editor-status-bar';
    this.statusBar.innerHTML = `
      <span id="mouse-pos">Mouse: (0, 0)</span>
      <span id="active-layer">Active layer: Layer 0</span>
      <span id="zoom-level">Zoom: 100%</span>
    `;

    // Assemble
    this.container.appendChild(this.topBar);
    this.container.appendChild(this.canvasContainer);
    this.container.appendChild(this.sidebar);
    this.container.appendChild(this.statusBar);

    this.setupSidebarResize();
    this.setupPanelTabs();

    // Initialize tabs
    this.tabs = document.getElementById('tabs-container')!;

    // Initialize tile selector
    this.tileSelector = new TileSelector(this.sidebar);
    
    // Initialize tool buttons
    this.setupToolButtons();
  }

  private setupSidebarResize(): void {
    const resizer = document.createElement('div');
    resizer.className = 'sidebar-resizer';
    this.sidebar.prepend(resizer);

    const setSidebarWidth = (width: number) => {
      const clamped = Math.min(this.maxSidebarWidth, Math.max(this.minSidebarWidth, width));
      document.documentElement.style.setProperty('--sidebar-width', `${clamped}px`);
    };

    const initialWidth = this.sidebar.getBoundingClientRect().width || 280;
    setSidebarWidth(initialWidth);

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) return;
      const delta = startX - event.clientX;
      setSidebarWidth(startWidth + delta);
    };

    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    resizer.addEventListener('pointerdown', (event: PointerEvent) => {
      event.preventDefault();
      isDragging = true;
      startX = event.clientX;
      startWidth = this.sidebar.getBoundingClientRect().width;
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  }

  private setupToolButtons(): void {
    const selectBtn = document.getElementById('tool-select') as HTMLButtonElement;
    const paintBtn = document.getElementById('tool-paint') as HTMLButtonElement;
    const eraseBtn = document.getElementById('tool-erase') as HTMLButtonElement;
    const entityBtn = document.getElementById('tool-entity') as HTMLButtonElement;
    const collisionBtn = document.getElementById('tool-collision') as HTMLButtonElement;
    const spawnBtn = document.getElementById('tool-spawn') as HTMLButtonElement;
    const doorBtn = document.getElementById('tool-door') as HTMLButtonElement;
    const backgroundAudioBtn = document.getElementById('tool-background-audio') as HTMLButtonElement;

    if (selectBtn) {
      this.toolButtons.set(EditorTool.Select, selectBtn);
      selectBtn.addEventListener('click', () => this.setTool(EditorTool.Select));
    }
    if (paintBtn) {
      this.toolButtons.set(EditorTool.Paint, paintBtn);
      paintBtn.addEventListener('click', () => this.setTool(EditorTool.Paint));
    }
    if (eraseBtn) {
      this.toolButtons.set(EditorTool.Erase, eraseBtn);
      eraseBtn.addEventListener('click', () => this.setTool(EditorTool.Erase));
    }
    if (entityBtn) {
      this.toolButtons.set(EditorTool.Entity, entityBtn);
      entityBtn.addEventListener('click', () => this.setTool(EditorTool.Entity));
    }
    if (collisionBtn) {
      this.toolButtons.set(EditorTool.Collision, collisionBtn);
      collisionBtn.addEventListener('click', () => this.setTool(EditorTool.Collision));
    }
    if (spawnBtn) {
      this.toolButtons.set(EditorTool.Spawn, spawnBtn);
      spawnBtn.addEventListener('click', () => this.setTool(EditorTool.Spawn));
    }
    if (doorBtn) {
      this.toolButtons.set(EditorTool.Door, doorBtn);
      doorBtn.addEventListener('click', () => this.setTool(EditorTool.Door));
    }
    if (backgroundAudioBtn) {
      this.toolButtons.set(EditorTool.BackgroundAudio, backgroundAudioBtn);
      backgroundAudioBtn.addEventListener('click', () => this.setTool(EditorTool.BackgroundAudio));
    }
  }

  private setupPanelTabs(): void {
    const tabs = Array.from(this.sidebar.querySelectorAll<HTMLButtonElement>('.panel-tab'));
    const panels = Array.from(this.sidebar.querySelectorAll<HTMLElement>('.panel-content'));
    if (!tabs.length || !panels.length) return;

    const setActive = (panelId: string) => {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.panel === panelId;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      panels.forEach((panel) => {
        const isActive = panel.dataset.panel === panelId;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const panelId = tab.dataset.panel;
        if (panelId) setActive(panelId);
      });
    });
  }

  setTool(tool: EditorTool): void {
    console.log(`EditorUI.setTool called with: ${tool}`);
    // Update button states
    this.toolButtons.forEach((btn, toolType) => {
      if (btn) {
        btn.classList.toggle('active', toolType === tool);
      }
    });
    
    if (this.onToolChanged) {
      console.log(`Calling onToolChanged callback with: ${tool}`);
      this.onToolChanged(tool);
    } else {
      console.warn('onToolChanged callback not set!');
    }
  }

  setOnToolChanged(callback: (tool: EditorTool) => void): void {
    this.onToolChanged = callback;
  }

  setOnLayerSelected(callback: (layerIndex: number) => void): void {
    this.onLayerSelected = callback;
  }

  setOnLayerVisibilityChanged(callback: (layerIndex: number, visible: boolean) => void): void {
    this.onLayerVisibilityChanged = callback;
  }

  getToolButtons(): Map<EditorTool, HTMLButtonElement> {
    return this.toolButtons;
  }

  getLevelNameInput(): HTMLInputElement | null {
    return document.getElementById('level-name-input') as HTMLInputElement;
  }

  getBackgroundSoundInput(): HTMLInputElement | null {
    return document.getElementById('level-bg-sound') as HTMLInputElement;
  }

  getEntityCollisionSoundInput(): HTMLInputElement | null {
    return document.getElementById('entity-sound-collision') as HTMLInputElement;
  }

  getEntityInteractSoundInput(): HTMLInputElement | null {
    return document.getElementById('entity-sound-interact') as HTMLInputElement;
  }

  getEntityTypeSelect(): HTMLSelectElement | null {
    return document.getElementById('entity-type-select') as HTMLSelectElement;
  }

  getEntityCustomTypeInput(): HTMLInputElement | null {
    return document.getElementById('entity-type-custom') as HTMLInputElement;
  }

  getEnemyAssetSelect(): HTMLSelectElement | null {
    return document.getElementById('enemy-asset-select') as HTMLSelectElement;
  }

  getEnemyAssetRow(): HTMLElement | null {
    return document.getElementById('enemy-asset-row');
  }

  getEnemyAISelect(): HTMLSelectElement | null {
    return document.getElementById('enemy-ai-select') as HTMLSelectElement;
  }

  getEnemyAIRow(): HTMLElement | null {
    return document.getElementById('enemy-ai-row');
  }

  getEntityPanel(): HTMLElement | null {
    return document.getElementById('entity-panel');
  }

  getEntityAudioPanel(): HTMLElement | null {
    return document.getElementById('entity-audio-panel');
  }

  getBackgroundAudioSubsection(): HTMLElement | null {
    return document.getElementById('level-audio-subsection');
  }

  getTilemapPanel(): HTMLElement | null {
    return this.sidebar.querySelector('.tilemap-panel');
  }

  getEntityAudioSubsection(): HTMLElement | null {
    return document.getElementById('entity-audio-subsection');
  }

  getEntitySnapToggle(): HTMLInputElement | null {
    return document.getElementById('entity-snap-grid') as HTMLInputElement;
  }

  getSaveButton(): HTMLButtonElement | null {
    return document.getElementById('btn-save') as HTMLButtonElement;
  }

  getLoadButton(): HTMLButtonElement | null {
    return document.getElementById('btn-load') as HTMLButtonElement;
  }

  getAddLayerButton(): HTMLButtonElement | null {
    return document.getElementById('btn-add-layer') as HTMLButtonElement;
  }

  getRenameLayerButton(): HTMLButtonElement | null {
    return document.getElementById('btn-rename-layer') as HTMLButtonElement;
  }

  updateLayerSelect(
    layers: Array<{ name: string; index: number; visible: boolean }>,
    activeIndex: number
  ): void {
    const list = document.getElementById('layer-list') as HTMLUListElement | null;
    if (!list) return;

    list.innerHTML = '';
    layers.forEach((layer) => {
      const item = document.createElement('li');
      item.className = `layer-item ${layer.index === activeIndex ? 'active' : ''}`;
      item.dataset.index = layer.index.toString();

      const visibilityToggle = document.createElement('input');
      visibilityToggle.type = 'checkbox';
      visibilityToggle.className = 'layer-visibility';
      visibilityToggle.checked = layer.visible;
      visibilityToggle.title = layer.visible ? 'Hide layer' : 'Show layer';
      visibilityToggle.addEventListener('click', (event) => event.stopPropagation());
      visibilityToggle.addEventListener('change', () => {
        if (this.onLayerVisibilityChanged) {
          this.onLayerVisibilityChanged(layer.index, visibilityToggle.checked);
        }
      });

      const name = document.createElement('span');
      name.className = 'layer-name';
      name.textContent = layer.name;

      const lockBtn = document.createElement('button');
      lockBtn.className = 'layer-lock';
      lockBtn.type = 'button';
      lockBtn.title = 'Lock layer';
      lockBtn.innerHTML = `
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <rect x="4" y="9" width="12" height="8" rx="1.5"></rect>
          <path d="M6 9V6a4 4 0 0 1 8 0v3"></path>
        </svg>
      `;
      lockBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        lockBtn.classList.toggle('locked');
      });

      item.appendChild(visibilityToggle);
      item.appendChild(lockBtn);
      item.appendChild(name);

      item.addEventListener('click', () => {
        if (this.onLayerSelected) {
          this.onLayerSelected(layer.index);
        }
      });

      list.appendChild(item);
    });
  }

  getTileSelector(): TileSelector {
    return this.tileSelector;
  }

  updateLayersTitle(levelName: string): void {
    const label = document.getElementById('layers-level-name');
    if (label) {
      label.textContent = levelName;
    }
  }

  addTab(name: string, tabId: string, active: boolean = false): void {
    const tab = document.createElement('div');
    tab.className = `tab ${active ? 'active' : ''}`;
    tab.dataset.tabId = tabId;
    tab.innerHTML = `
      <span>${name}</span>
      <button class="tab-close">×</button>
    `;
    const closeBtn = tab.querySelector('.tab-close') as HTMLButtonElement | null;
    if (closeBtn) {
      closeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (this.onTabClosed) {
          this.onTabClosed(tabId);
        }
      });
    }
    tab.addEventListener('click', () => {
      if (this.onTabSelected) {
        this.onTabSelected(tabId);
      }
    });
    this.tabs.appendChild(tab);
  }

  setActiveTab(tabId: string): void {
    const tabs = Array.from(this.tabs.querySelectorAll<HTMLElement>('.tab'));
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tabId === tabId);
    });
  }

  updateTabLabel(tabId: string, name: string): void {
    const tab = this.tabs.querySelector<HTMLElement>(`.tab[data-tab-id="${tabId}"]`);
    if (!tab) return;
    const label = tab.querySelector('span');
    if (label) {
      label.textContent = name;
    }
  }

  removeTab(tabId: string): void {
    const tab = this.tabs.querySelector<HTMLElement>(`.tab[data-tab-id="${tabId}"]`);
    if (tab && tab.parentElement) {
      tab.parentElement.removeChild(tab);
    }
  }

  setOnTabSelected(callback: (tabId: string) => void): void {
    this.onTabSelected = callback;
  }

  setOnTabClosed(callback: (tabId: string) => void): void {
    this.onTabClosed = callback;
  }

  updateMousePosition(x: number, y: number): void {
    const mousePos = document.getElementById('mouse-pos');
    if (mousePos) {
      mousePos.textContent = `Mouse: (${Math.round(x)}, ${Math.round(y)})`;
    }
  }

  updateActiveLayer(layer: number): void {
    const activeLayer = document.getElementById('active-layer');
    if (activeLayer) {
      activeLayer.textContent = `Active layer: Layer ${layer}`;
    }
  }

  updateZoom(zoom: number): void {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
      zoomLevel.textContent = `Zoom: ${Math.round(zoom * 100)}%`;
    }
  }

  getCanvas(): HTMLCanvasElement {
    const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    return canvas;
  }
}
