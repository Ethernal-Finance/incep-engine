import { EntityManager } from '../entities/EntityManager';
import { Entity } from '../entities/Entity';
import { Transform } from '../components/Transform';
import { Collider, CollisionLayer } from '../components/Collider';
import { Movement } from '../components/Movement';
import { Rect } from '../utils/Rect';
import { Tilemap } from '../data/Tilemap';
import { Vector2 } from '../utils/Vector2';

export class CollisionSystem {
  private entityManager: EntityManager;
  private tilemap: Tilemap | null = null;
  private collisionPairs: Map<number, Set<number>> = new Map();

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  setTilemap(tilemap: Tilemap): void {
    this.tilemap = tilemap;
  }

  checkTileCollision(position: Vector2, collider: Collider): boolean {
    if (!this.tilemap) return false;

    const worldBounds = collider.getWorldBounds(position);
    const tileSize = this.tilemap.tileSize;

    // Check all tiles that the collider overlaps
    const minTileX = Math.floor(worldBounds.left / tileSize);
    const maxTileX = Math.floor(worldBounds.right / tileSize);
    const minTileY = Math.floor(worldBounds.top / tileSize);
    const maxTileY = Math.floor(worldBounds.bottom / tileSize);

    for (let y = minTileY; y <= maxTileY; y++) {
      for (let x = minTileX; x <= maxTileX; x++) {
        if (this.tilemap.isCollisionAt(x, y)) {
          return true;
        }
      }
    }

    return false;
  }

  checkEntityCollision(entityA: Entity, entityB: Entity): boolean {
    const transformA = entityA.getComponent(Transform);
    const colliderA = entityA.getComponent(Collider);
    const transformB = entityB.getComponent(Transform);
    const colliderB = entityB.getComponent(Collider);

    if (!transformA || !colliderA || !transformB || !colliderB) return false;
    if (!colliderA.enabled || !colliderB.enabled) return false;

    const boundsA = colliderA.getWorldBounds(transformA.position);
    const boundsB = colliderB.getWorldBounds(transformB.position);

    return boundsA.intersects(boundsB);
  }

  resolveTileCollision(entity: Entity, deltaTime: number): Vector2 {
    const transform = entity.getComponent(Transform);
    const collider = entity.getComponent(Collider);
    const movement = entity.getComponent(Movement);

    if (!transform || !collider || !movement) {
      return transform ? transform.position.clone() : Vector2.zero();
    }

    if (collider.isTrigger || collider.layer === CollisionLayer.None) {
      return transform.position;
    }

    let newPosition = transform.position.clone();

    // Check X axis
    const testPosX = new Vector2(newPosition.x + movement.velocity.x * deltaTime, newPosition.y);
    if (this.checkTileCollision(testPosX, collider)) {
      // Try to slide along Y axis
      const testPosY = new Vector2(newPosition.x, newPosition.y + movement.velocity.y * deltaTime);
      if (!this.checkTileCollision(testPosY, collider)) {
        newPosition = testPosY;
        movement.velocity.x = 0;
      } else {
        movement.velocity.x = 0;
        movement.velocity.y = 0;
      }
    } else {
      newPosition.x = testPosX.x;
    }

    // Check Y axis
    const testPosY = new Vector2(newPosition.x, newPosition.y + movement.velocity.y * deltaTime);
    if (this.checkTileCollision(testPosY, collider)) {
      movement.velocity.y = 0;
    } else {
      newPosition.y = testPosY.y;
    }

    return newPosition;
  }

  update(deltaTime: number): void {
    const entities = this.entityManager.getEntitiesWithComponent(Collider);
    const currentPairs = new Map<number, Set<number>>();

    // Check entity-to-entity collisions
    for (let i = 0; i < entities.length; i++) {
      const entityA = entities[i];
      const colliderA = entityA.getComponent(Collider)!;
      if (!colliderA.enabled) continue;

      for (let j = i + 1; j < entities.length; j++) {
        const entityB = entities[j];
        const colliderB = entityB.getComponent(Collider)!;
        if (!colliderB.enabled) continue;

        // Check if layers can collide
        if (!this.canLayersCollide(colliderA.layer, colliderB.layer)) continue;

        if (this.checkEntityCollision(entityA, entityB)) {
          // Track collision pair
          const pairId = this.getPairId(entityA.id, entityB.id);
          if (!currentPairs.has(entityA.id)) {
            currentPairs.set(entityA.id, new Set());
          }
          currentPairs.get(entityA.id)!.add(entityB.id);

          // Check if this is a new collision
          const wasColliding = this.collisionPairs.has(entityA.id) &&
            this.collisionPairs.get(entityA.id)!.has(entityB.id);

          if (!wasColliding) {
            // On collision enter
            if (colliderA.onCollisionEnter) {
              colliderA.onCollisionEnter(colliderB);
            }
            if (colliderB.onCollisionEnter) {
              colliderB.onCollisionEnter(colliderA);
            }
          } else {
            // On collision stay
            if (colliderA.onCollisionStay) {
              colliderA.onCollisionStay(colliderB);
            }
            if (colliderB.onCollisionStay) {
              colliderB.onCollisionStay(colliderA);
            }
          }
        }
      }
    }

    // Check for collision exits
    for (const [entityId, collidingWith] of this.collisionPairs.entries()) {
      const currentCollisions = currentPairs.get(entityId);
      if (!currentCollisions) {
        // All collisions ended
        const entity = this.entityManager.get(entityId);
        if (entity) {
          const collider = entity.getComponent(Collider);
          if (collider && collider.onCollisionExit) {
            // Notify about all exits (simplified)
            collider.onCollisionExit(collider);
          }
        }
      } else {
        // Check which collisions ended
        for (const otherId of collidingWith) {
          if (!currentCollisions.has(otherId)) {
            const entity = this.entityManager.get(entityId);
            const otherEntity = this.entityManager.get(otherId);
            if (entity && otherEntity) {
              const collider = entity.getComponent(Collider);
              const otherCollider = otherEntity.getComponent(Collider);
              if (collider && collider.onCollisionExit && otherCollider) {
                collider.onCollisionExit(otherCollider);
              }
            }
          }
        }
      }
    }

    this.collisionPairs = currentPairs;

    // Resolve tile collisions for solid entities
    for (const entity of entities) {
      const transform = entity.getComponent(Transform);
      const collider = entity.getComponent(Collider)!;

      if (!transform || collider.isTrigger) continue;

      const newPosition = this.resolveTileCollision(entity, deltaTime);
      transform.position = newPosition;
    }
  }

  private canLayersCollide(layerA: CollisionLayer, layerB: CollisionLayer): boolean {
    // Solid layer collides with everything except None
    if (layerA === CollisionLayer.Solid || layerB === CollisionLayer.Solid) {
      return layerA !== CollisionLayer.None && layerB !== CollisionLayer.None;
    }
    
    // Same layer doesn't collide with itself (except triggers)
    if (layerA === layerB) {
      return false;
    }

    // Player collides with Enemy, Item, NPC, Solid
    if (layerA === CollisionLayer.Player || layerB === CollisionLayer.Player) {
      return true;
    }

    // Enemy collides with Player, Solid
    if (layerA === CollisionLayer.Enemy || layerB === CollisionLayer.Enemy) {
      return layerA === CollisionLayer.Player || layerB === CollisionLayer.Player ||
             layerA === CollisionLayer.Solid || layerB === CollisionLayer.Solid;
    }

    return false;
  }

  private getPairId(idA: number, idB: number): string {
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  }
}

