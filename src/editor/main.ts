import { Editor } from './Editor';
import { EditorUI } from './UI/EditorUI';
import { Input } from '../engine/Input';
import { Time } from '../engine/Time';

class EditorApp {
  private editor: Editor;
  private editorUI: EditorUI;
  private running: boolean = false;

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
    
    // Set default tool to Paint
    this.editor.setTool('paint' as any);
    
    this.setupEventListeners();
    this.start();
  }

  private setupEventListeners(): void {
    // Update status bar
    const updateStatusBar = () => {
      const mousePos = Input.getMousePosition();
      this.editorUI.updateMousePosition(mousePos.x, mousePos.y);
      this.editorUI.updateActiveLayer(this.editor.getActiveLayer());
      this.editorUI.updateZoom(this.editor.getZoom());
    };

    // Control buttons
    const playBtn = document.getElementById('btn-play');
    const stopBtn = document.getElementById('btn-stop');
    const pauseBtn = document.getElementById('btn-pause');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        console.log('Play clicked');
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        console.log('Stop clicked');
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        console.log('Pause clicked');
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
    this.gameLoop();
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    Time.update();
    Input.update();

    this.editor.update(Time.getDeltaTime());
    this.editor.render();

    requestAnimationFrame(this.gameLoop);
  };
}

// Initialize editor when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EditorApp();
  });
} else {
  new EditorApp();
}

