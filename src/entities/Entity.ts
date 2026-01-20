import { Component } from '../components/Component';
import { Transform } from '../components/Transform';

export class Entity {
  private static nextId: number = 1;
  public id: number;
  public name: string;
  public components: Map<string, Component> = new Map();
  public enabled: boolean = true;

  constructor(name: string = 'Entity') {
    this.id = Entity.nextId++;
    this.name = name;
  }

  addComponent<T extends Component>(component: T): T {
    component.entityId = this.id;
    this.components.set(component.constructor.name, component);
    return component;
  }

  getComponent<T extends Component>(componentType: new (...args: any[]) => T): T | null {
    return (this.components.get(componentType.name) as T) || null;
  }

  hasComponent<T extends Component>(componentType: new (...args: any[]) => T): boolean {
    return this.components.has(componentType.name);
  }

  removeComponent<T extends Component>(componentType: new (...args: any[]) => T): void {
    this.components.delete(componentType.name);
  }

  getTransform(): Transform | null {
    return this.getComponent(Transform);
  }

  destroy(): void {
    this.components.clear();
    this.enabled = false;
  }
}

