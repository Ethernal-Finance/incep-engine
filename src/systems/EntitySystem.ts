import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';
import { Collider } from '../components/Collider';
import { Movement } from '../components/Movement';
import { Health } from '../components/Health';
import { Inventory } from '../components/Inventory';
import { Dialogue } from '../components/Dialogue';

export type Component = Transform | Sprite | Collider | Movement | Health | Inventory | Dialogue;

export class Entity {
  public id: string;
  public name: string;
  public components: Map<string, Component>;
  public active: boolean;

  constructor(id: string, name: string = 'Entity') {
    this.id = id;
    this.name = name;
    this.components = new Map();
    this.active = true;
  }

  addComponent<T extends Component>(type: string, component: T): T {
    this.components.set(type, component);
    return component;
  }

  getComponent<T extends Component>(type: string): T | null {
    return (this.components.get(type) as T) || null;
  }

  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  removeComponent(type: string): void {
    this.components.delete(type);
  }
}

export class EntitySystem {
  private entities: Map<string, Entity>;
  private nextId: number = 0;

  constructor() {
    this.entities = new Map();
  }

  createEntity(name: string = 'Entity'): Entity {
    const id = `entity_${this.nextId++}`;
    const entity = new Entity(id, name);
    this.entities.set(id, entity);
    return entity;
  }

  removeEntity(id: string): void {
    this.entities.delete(id);
  }

  getEntity(id: string): Entity | null {
    return this.entities.get(id) || null;
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values()).filter((e) => e.active);
  }

  getEntitiesWithComponent(componentType: string): Entity[] {
    return this.getAllEntities().filter((e) => e.hasComponent(componentType));
  }

  update(deltaTime: number): void {
    // Systems will update entities
  }
}

