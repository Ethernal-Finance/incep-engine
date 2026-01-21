# Smoke Test Checklist

This document provides a manual test checklist to verify that all editor tools, save/load functionality, and runtime playback are working correctly.

## Editor Tools

### Tool Switching
- [ ] Click "Select" tool button - button highlights, cursor changes behavior
- [ ] Click "Paint" tool button - button highlights, can paint tiles on click
- [ ] Click "Erase" tool button - button highlights, can erase tiles on right-click
- [ ] Click "Entity" tool button - button highlights, can place entities on click
- [ ] Press "1" key - switches to Select tool
- [ ] Press "2" key - switches to Paint tool
- [ ] Press "3" key - switches to Erase tool
- [ ] Press "4" key - switches to Entity tool

### Paint Tool
- [ ] Select Paint tool
- [ ] Click and drag on tilemap - tiles are painted in rectangle
- [ ] Select different tile from tile selector
- [ ] Paint again - new tile is used
- [ ] Verify tiles appear correctly on the tilemap

### Erase Tool
- [ ] Select Erase tool
- [ ] Right-click on painted tiles - tiles are removed (set to 0)
- [ ] Verify tiles disappear from tilemap

### Entity Tool
- [ ] Select Entity tool
- [ ] Click on tilemap - entity is placed (green rectangle)
- [ ] Click on existing entity - entity is selected (yellow outline)
- [ ] Press Delete key with entity selected - entity is removed
- [ ] Place multiple entities - all appear correctly

### Select Tool
- [ ] Select Select tool
- [ ] Click on entity - entity is selected (yellow outline)
- [ ] Click on empty space - selection is cleared

## Layer Management

### Layer Selector
- [ ] Open layer dropdown - shows "Layer 0" by default
- [ ] Click "Add Layer" button - new layer appears in dropdown
- [ ] Select different layer from dropdown - active layer changes
- [ ] Paint tiles on Layer 0 - tiles appear
- [ ] Switch to Layer 1
- [ ] Paint tiles on Layer 1 - tiles appear on different layer
- [ ] Switch back to Layer 0 - original tiles still visible
- [ ] Verify status bar shows correct active layer

### Layer Isolation
- [ ] Paint tiles on Layer 0
- [ ] Switch to Layer 1
- [ ] Verify Layer 0 tiles are still visible (layers render together)
- [ ] Paint different tiles on Layer 1
- [ ] Verify both layers render correctly

## Tileset Selection

### Tileset Preview
- [ ] Select a tileset from dropdown (e.g., "Modern Exteriors Complete Tileset")
- [ ] Verify tileset preview shows all tiles
- [ ] Click on a tile in preview - tile is selected, preview doesn't reset
- [ ] Click on different tile - new tile selected, same tileset shown
- [ ] Switch to different tileset - preview updates
- [ ] Click tile again - tileset is preserved (doesn't reset to default)

## Save/Load Functionality

### Save Level
- [ ] Edit level (paint tiles, place entities)
- [ ] Enter level name in input field
- [ ] Click "Save" button
- [ ] Verify success message appears
- [ ] Check browser localStorage - level data should be stored with key "level_[name]"

### Load Level
- [ ] Create and save a level
- [ ] Make some changes to current level
- [ ] Click "Load" button
- [ ] Verify load dialog appears with saved levels
- [ ] Select a saved level
- [ ] Click "Load" button in dialog
- [ ] Verify level loads correctly (tiles and entities match saved state)
- [ ] Verify level name input updates to loaded level name

### Level Persistence
- [ ] Save a level
- [ ] Refresh the page
- [ ] Load the saved level
- [ ] Verify level data is preserved correctly

## Runtime Playback

### Play Button
- [ ] Create a level with tiles and at least one player entity
- [ ] Click "Play" button (▶)
- [ ] Verify "Loading assets..." dialog appears briefly
- [ ] Verify runtime starts (editor UI may be hidden/replaced)
- [ ] Verify tilemap renders correctly
- [ ] Verify entities render correctly (colored rectangles if sprites not available)

### Player Controls
- [ ] Start runtime with player entity
- [ ] Press W or Arrow Up - player moves up
- [ ] Press S or Arrow Down - player moves down
- [ ] Press A or Arrow Left - player moves left
- [ ] Press D or Arrow Right - player moves right
- [ ] Press multiple keys - player moves diagonally
- [ ] Verify camera follows player

### Pause Button
- [ ] Start runtime
- [ ] Verify game is running (player can move)
- [ ] Click "Pause" button (⏸)
- [ ] Verify game pauses (player stops moving, but screen still renders)
- [ ] Click "Pause" again - game resumes

### Stop Button
- [ ] Start runtime
- [ ] Click "Stop" button (■)
- [ ] Verify runtime stops and returns to editor mode
- [ ] Verify editor is functional (can paint, place entities, etc.)
- [ ] Verify level data is unchanged

## Runtime Systems

### Tilemap Rendering
- [ ] Start runtime with painted tilemap
- [ ] Verify all tilemap layers render correctly
- [ ] Verify tiles appear in correct positions
- [ ] Verify tileset images are used (or fallback colors if images missing)

### Entity Rendering
- [ ] Start runtime with entities placed
- [ ] Verify player entity renders (blue rectangle)
- [ ] Verify enemy entities render (red rectangles)
- [ ] Verify NPC entities render (yellow rectangles)
- [ ] Verify item entities render (magenta rectangles)
- [ ] Verify entities appear at correct positions

### Camera System
- [ ] Start runtime with player entity
- [ ] Move player around
- [ ] Verify camera smoothly follows player
- [ ] Verify camera stays within level bounds (if bounds set)

### Collision System
- [ ] Start runtime with player and other entities
- [ ] Move player into other entities
- [ ] Verify collision detection works (entities don't overlap incorrectly)
- [ ] Note: Full collision response may need additional implementation

## Error Handling

### Missing Assets
- [ ] Start runtime without entity sprite images
- [ ] Verify game still runs (uses fallback colored rectangles)
- [ ] Verify no console errors break the game

### Invalid Level Data
- [ ] Try to load corrupted level data from localStorage
- [ ] Verify error message appears
- [ ] Verify editor remains functional

## Integration Tests

### Full Workflow
- [ ] Create new level
- [ ] Paint tiles on multiple layers
- [ ] Place player entity
- [ ] Place enemy and item entities
- [ ] Save level
- [ ] Start runtime
- [ ] Verify everything renders and works correctly
- [ ] Stop runtime
- [ ] Load saved level
- [ ] Verify all data is preserved
- [ ] Start runtime again
- [ ] Verify loaded level works correctly

## Notes

- Some features may show placeholder visuals (colored rectangles) if sprite assets are not available
- Collision system may need additional tuning for proper gameplay
- Camera bounds may need to be set based on level size
- Asset loading errors are logged to console but don't break the game

