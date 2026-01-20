import { Entity } from './Entity';
import { Component } from '../components/Component';

export class EntityManager {
  private entities: Map<number, Entity> = new Map();
  private entitiesByName: Map<string, Entity[]> = new Map();

  create(name: string = 'Entity'): Entity {
    const entity = new Entity(name);
    this.registerEntity(entity);
    return entity;
  }

  registerEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    const nameList = this.entitiesByName.get(entity.name) || [];
    nameList.push(entity);
    this.entitiesByName.set(entity.name, nameList);
  }

  get(id: number): Entity | null {
    return this.entities.get(id) || null;
  }

  getByName(name: string): Entity[] {
    return this.entitiesByName.get(name) || [];
  }

  getAll(): Entity[] {
    return Array.from(this.entities.values());
  }

  getEntitiesWithComponent<T extends Component>(componentType: new (...args: any[]) => T): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.enabled && entity.hasComponent(componentType)) {
        result.push(entity);
      }
    }
    return result;
  }

  remove(id: number): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    entity.destroy();
    this.entities.delete(id);

    const nameList = this.entitiesByName.get(entity.name);
    if (nameList) {
      const index = nameList.indexOf(entity);
      if (index !== -1) {
        nameList.splice(index, 1);
      }
    }
  }

  clear(): void {
    for (const entity of this.entities.values()) {
      entity.destroy();
    }
    this.entities.clear();
    this.entitiesByName.clear();
  }

  update(deltaTime: number): void {
    for (const entity of this.entities.values()) {
      if (!entity.enabled) continue;
      // Entity update logic can be added here if needed
    }
  }
}

