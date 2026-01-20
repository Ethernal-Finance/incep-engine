import { Editor, EditorTool } from './Editor';
import { Renderer } from '../engine/Renderer';
import { Tilemap } from '../data/Tilemap';
import { Input } from '../engine/Input';
import { Vector2 } from '../utils/Vector2';
import { TilemapRenderer } from '../systems/TilemapRenderer';

export class TilemapEditor {
  private editor: Editor;
  private tilemap: Tilemap | null = null;
  private selectedTile: number = 1;
  private currentLayer: string = 'background';
  private isPainting: boolean = false;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  setTilemap(tilemap: Tilemap): void {
    this.tilemap = tilemap;
    if (tilemap.layers.length > 0) {
      this.currentLayer = tilemap.layers[0].name;
    }
  }

  setSelectedTile(tileId: number): void {
    this.selectedTile = tileId;
  }

  setCurrentLayer(layerName: string): void {
    this.currentLayer = layerName;
  }

  update(deltaTime: number): void {
    if (!this.tilemap) return;
    if (this.editor.getTool() !== EditorTool.Paint && this.editor.getTool() !== EditorTool.Erase) return;

    const renderer = this.editor.getRenderer();
    const mousePos = Input.getMousePosition();
    const worldPos = renderer.screenToWorld(mousePos);
    const tile = this.tilemap.worldToTile(worldPos.x, worldPos.y);

    if (Input.getMouseButton(0)) {
      if (!this.isPainting) {
        this.isPainting = true;
        this.paintTile(tile.x, tile.y);
      } else {
        // Continuous painting
        this.paintTile(tile.x, tile.y);
      }
    } else {
      this.isPainting = false;
    }

    // Handle collision layer editing
    if (this.editor.getTool() === EditorTool.Collision) {
      if (Input.getMouseButton(0)) {
        this.tilemap.setCollisionAt(tile.x, tile.y, true);
      } else if (Input.getMouseButton(2)) {
        this.tilemap.setCollisionAt(tile.x, tile.y, false);
      }
    }
  }

  private paintTile(x: number, y: number): void {
    if (!this.tilemap) return;

    if (this.editor.getTool() === EditorTool.Paint) {
      this.tilemap.setTileAt(this.currentLayer, x, y, this.selectedTile);
    } else if (this.editor.getTool() === EditorTool.Erase) {
      this.tilemap.setTileAt(this.currentLayer, x, y, 0);
    }
  }

  render(renderer: Renderer): void {
    if (!this.tilemap) return;

    const cameraPos = this.editor.getCameraPosition();
    TilemapRenderer.render(
      renderer,
      this.tilemap,
      cameraPos.x,
      cameraPos.y,
      renderer.getWidth() / this.editor.getCameraZoom(),
      renderer.getHeight() / this.editor.getCameraZoom()
    );

    // Render collision layer overlay if tool is active
    if (this.editor.getTool() === EditorTool.Collision) {
      TilemapRenderer.renderCollisionLayer(
        renderer,
        this.tilemap,
        cameraPos.x,
        cameraPos.y,
        renderer.getWidth() / this.editor.getCameraZoom(),
        renderer.getHeight() / this.editor.getCameraZoom()
      );
    }

    // Render tile preview at mouse position
    if (this.editor.getTool() === EditorTool.Paint || this.editor.getTool() === EditorTool.Erase) {
      const mousePos = Input.getMousePosition();
      const worldPos = renderer.screenToWorld(mousePos);
      const tile = this.tilemap.worldToTile(worldPos.x, worldPos.y);
      const worldTilePos = this.tilemap.tileToWorld(tile.x, tile.y);
      const screenPos = renderer.worldToScreen(new Vector2(worldTilePos.x, worldTilePos.y));

      renderer.strokeRect(
        screenPos.x,
        screenPos.y,
        this.tilemap.tileSize * this.editor.getCameraZoom(),
        this.tilemap.tileSize * this.editor.getCameraZoom(),
        '#ffff00',
        2
      );
    }
  }
}

