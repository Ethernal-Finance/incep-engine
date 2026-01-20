import { LevelEntity } from '../data/Level';

export class PropertyInspector {
  private selectedObject: LevelEntity | null = null;

  setSelectedObject(obj: LevelEntity | null): void {
    this.selectedObject = obj;
  }

  getSelectedObject(): LevelEntity | null {
    return this.selectedObject;
  }

  updateProperty(key: string, value: any): void {
    if (!this.selectedObject) return;

    if (!this.selectedObject.properties) {
      this.selectedObject.properties = {};
    }

    this.selectedObject.properties[key] = value;
  }

  getProperty(key: string): any {
    if (!this.selectedObject || !this.selectedObject.properties) return null;
    return this.selectedObject.properties[key];
  }
}

