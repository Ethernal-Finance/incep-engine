# Inception Game Engine

A Construct 3 style game engine built with TypeScript and HTML5 Canvas 2D for creating top-down Zelda-like RPG games.

## Features

### Core Engine
- **Game Loop**: RequestAnimationFrame-based with delta time
- **Renderer**: Canvas 2D wrapper with camera support
- **Input System**: Keyboard and mouse input handling
- **Scene Management**: Multiple scene support
- **Asset Loader**: Image loading and caching

### Gameplay Systems
- **Movement System**: 8-directional movement with collision
- **Camera System**: Smooth following with boundaries
- **Collision System**: Tile-based and AABB collision detection
- **Animation System**: Sprite sheet support with frame-based animations
- **Entity System**: Component-based entity architecture
- **Inventory System**: Item management and equipment
- **Combat System**: Health, damage, and attack mechanics
- **Dialogue System**: Text boxes with choices and dialogue trees

### Level Builder
- **Visual Editor**: Drag-and-drop level creation
- **Tilemap Editor**: Paint and erase tiles with multiple layers
- **Entity Placement**: Place and edit entities visually
- **Property Inspector**: Edit entity properties in real-time
- **Export/Import**: Save and load levels as JSON

## Project Structure

```
inception-game/
├── src/
│   ├── engine/          # Core engine systems
│   ├── systems/         # Gameplay systems
│   ├── components/      # ECS components
│   ├── entities/        # Entity definitions
│   ├── editor/          # Level builder
│   ├── data/            # Data structures
│   ├── utils/           # Utility classes
│   └── scenes/          # Game scenes
├── public/
│   ├── index.html       # Game view
│   ├── editor.html      # Editor view
│   └── assets/          # Game assets
└── package.json
```

## Getting Started

### Installation

```bash
npm install
```

### Development

Run the game:
```bash
npm run dev
```

Then open:
- `http://localhost:3000` for the game
- `http://localhost:3000/editor.html` for the level editor

### Building

```bash
npm run build
```

## Usage

### Creating a Game Scene

```typescript
import { Scene } from './engine/Scene';
import { EntityManager } from './entities/EntityManager';
import { Player } from './entities/Player';

class MyScene extends Scene {
  private entityManager: EntityManager;
  
  constructor() {
    super('MyScene');
    this.entityManager = new EntityManager();
  }
  
  async init() {
    const player = new Player(100, 100);
    this.entityManager.registerEntity(player);
  }
  
  update(deltaTime: number) {
    // Update game logic
  }
  
  render(renderer: Renderer) {
    // Render game
  }
}
```

### Using the Level Editor

1. Open `editor.html` in your browser
2. Create a new level or load an existing one
3. Use the toolbar to select tools:
   - **Select**: Select and move entities
   - **Paint**: Paint tiles on the tilemap
   - **Erase**: Erase tiles
   - **Entity**: Place entities
   - **Collision**: Edit collision layer
4. Use the property panel to edit selected entities
5. Save your level as JSON

### Level Format

Levels are saved as JSON with the following structure:

```json
{
  "version": "1.0",
  "name": "Level 1",
  "tilemap": {
    "width": 50,
    "height": 50,
    "tileSize": 32,
    "layers": [
      {"name": "background", "data": [...]},
      {"name": "collision", "data": [...]}
    ]
  },
  "entities": [
    {"type": "player", "x": 100, "y": 100},
    {"type": "npc", "x": 200, "y": 200}
  ]
}
```

## Controls

### Game
- **WASD / Arrow Keys**: Move player
- **Space / Left Click**: Attack
- **E**: Interact with NPCs/Items
- **Escape**: Close dialogue

### Editor
- **Left Click**: Paint/Select
- **Right Click**: Erase
- **Middle Mouse / Space + Drag**: Pan camera
- **Mouse Wheel**: Zoom
- **Delete**: Delete selected entity

## Architecture

The engine uses an Entity Component System (ECS) architecture:

- **Entities**: Game objects (Player, NPC, Enemy, Item)
- **Components**: Data containers (Transform, Sprite, Collider, etc.)
- **Systems**: Logic processors (MovementSystem, CollisionSystem, etc.)

This architecture provides flexibility and modularity for game development.

## License

MIT

