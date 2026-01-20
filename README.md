# Construct 3 Style Game Engine

A web-based game engine built with TypeScript and Canvas 2D, featuring top-down Zelda-like gameplay systems and a visual level builder with a Construct 3-style interface.

## Features

- **Core Engine**: Game loop, renderer, input handling, scene management, asset loading
- **ECS Architecture**: Entity Component System for flexible game object composition
- **Game Systems**: Movement, camera, collision, animation, inventory, combat, dialogue
- **Visual Editor**: Construct 3-style interface with tilemap editing, entity placement, and property inspection
- **Level Management**: JSON-based level format with save/load functionality

## Project Structure

```
inception-game/
├── src/
│   ├── engine/          # Core engine systems
│   ├── systems/         # Gameplay systems
│   ├── components/      # ECS components
│   ├── entities/        # Entity factories
│   ├── editor/          # Level editor
│   ├── data/            # Data structures
│   └── utils/           # Utility classes
├── public/              # Static assets and HTML
└── package.json
```

## Getting Started

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

Then navigate to:
- `http://localhost:3000/editor.html` - Level editor
- `http://localhost:3000/index.html` - Game runtime

### Build

Build for production:

```bash
npm run build
```

## Editor Interface

The editor features a Construct 3-style interface with:

- **Top Bar**: Menu, undo/redo, play/stop/pause controls, tabs
- **Canvas Area**: Main editing workspace with pan/zoom
- **Sidebar**: Assets browser and tile selector
- **Status Bar**: Mouse coordinates, active layer, zoom level

### Editor Tools

- **Select**: Select and move entities
- **Paint**: Paint tiles on the tilemap
- **Erase**: Remove tiles
- **Entity**: Place game entities

### Controls

- **Left Click**: Paint tiles / Place entities
- **Right Click**: Erase tiles
- **Middle Mouse**: Pan camera
- **Mouse Wheel**: Zoom in/out
- **Delete**: Remove selected entity

## Architecture

### Entity Component System

Entities are composed of components:
- `Transform`: Position, rotation, scale
- `Sprite`: Visual representation
- `Collider`: Collision detection
- `Movement`: Movement properties
- `Health`: Health/damage system
- `Inventory`: Item management
- `Dialogue`: Dialogue trees

### Systems

Systems process entities with specific components:
- `MovementSystem`: Handles entity movement
- `CameraSystem`: Camera follow and bounds
- `CollisionSystem`: Collision detection
- `AnimationSystem`: Sprite animations
- `CombatSystem`: Health and damage
- `DialogueSystem`: Dialogue management

## Level Format

Levels are stored as JSON:

```json
{
  "version": "1.0",
  "name": "Level 1",
  "tilemap": {
    "width": 50,
    "height": 50,
    "tileSize": 32,
    "layers": [
      {"name": "background", "data": [...]}
    ]
  },
  "entities": [
    {"type": "player", "x": 100, "y": 100}
  ]
}
```

## Technology Stack

- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Canvas 2D**: Rendering (no external dependencies)
- **Custom Engine**: Full control over game systems

## License

MIT

