import { Editor } from './Editor';
import { Entity } from '../entities/Entity';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';

export class PropertyInspector {
  private editor: Editor;
  private panel: HTMLElement | null = null;
  private selectedEntity: Entity | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  createPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'editor-property-panel';
    panel.style.cssText = `
      position: fixed;
      right: 0;
      top: 50px;
      width: 300px;
      bottom: 0;
      background: #1a1a2e;
      border-left: 2px solid #444;
      padding: 20px;
      overflow-y: auto;
      z-index: 999;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Properties';
    title.style.color = 'white';
    panel.appendChild(title);

    const content = document.createElement('div');
    content.id = 'property-content';
    content.style.color = 'white';
    panel.appendChild(content);

    document.body.appendChild(panel);
    this.panel = panel;
  }

  setSelectedEntity(entity: Entity | null): void {
    this.selectedEntity = entity;
    this.updatePanel();
  }

  private updatePanel(): void {
    const content = document.getElementById('property-content');
    if (!content) return;

    content.innerHTML = '';

    if (!this.selectedEntity) {
      content.innerHTML = '<p>No entity selected</p>';
      return;
    }

    // Entity name
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name:';
    nameLabel.style.display = 'block';
    nameLabel.style.marginTop = '10px';
    content.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = this.selectedEntity.name;
    nameInput.style.cssText = 'width: 100%; padding: 5px; margin-top: 5px;';
    nameInput.onchange = () => {
      this.selectedEntity!.name = nameInput.value;
    };
    content.appendChild(nameInput);

    // Transform properties
    const transform = this.selectedEntity.getComponent(Transform);
    if (transform) {
      const transformTitle = document.createElement('h4');
      transformTitle.textContent = 'Transform';
      transformTitle.style.marginTop = '20px';
      content.appendChild(transformTitle);

      // Position X
      this.createNumberInput(
        content,
        'X:',
        transform.position.x,
        (value) => { transform.position.x = value; }
      );

      // Position Y
      this.createNumberInput(
        content,
        'Y:',
        transform.position.y,
        (value) => { transform.position.y = value; }
      );

      // Rotation
      this.createNumberInput(
        content,
        'Rotation:',
        transform.rotation,
        (value) => { transform.rotation = value; }
      );

      // Scale X
      this.createNumberInput(
        content,
        'Scale X:',
        transform.scale.x,
        (value) => { transform.scale.x = value; }
      );

      // Scale Y
      this.createNumberInput(
        content,
        'Scale Y:',
        transform.scale.y,
        (value) => { transform.scale.y = value; }
      );
    }

    // Sprite properties
    const sprite = this.selectedEntity.getComponent(Sprite);
    if (sprite) {
      const spriteTitle = document.createElement('h4');
      spriteTitle.textContent = 'Sprite';
      spriteTitle.style.marginTop = '20px';
      content.appendChild(spriteTitle);

      // Image path
      const imageLabel = document.createElement('label');
      imageLabel.textContent = 'Image Path:';
      imageLabel.style.display = 'block';
      imageLabel.style.marginTop = '10px';
      content.appendChild(imageLabel);

      const imageInput = document.createElement('input');
      imageInput.type = 'text';
      imageInput.value = sprite.imagePath;
      imageInput.style.cssText = 'width: 100%; padding: 5px; margin-top: 5px;';
      imageInput.onchange = () => {
        sprite.imagePath = imageInput.value;
        // Could load image here
      };
      content.appendChild(imageInput);

      // Width
      this.createNumberInput(
        content,
        'Width:',
        sprite.width,
        (value) => { sprite.width = value; }
      );

      // Height
      this.createNumberInput(
        content,
        'Height:',
        sprite.height,
        (value) => { sprite.height = value; }
      );
    }
  }

  private createNumberInput(
    parent: HTMLElement,
    label: string,
    value: number,
    onChange: (value: number) => void
  ): void {
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.display = 'block';
    labelEl.style.marginTop = '10px';
    parent.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'number';
    input.value = value.toString();
    input.style.cssText = 'width: 100%; padding: 5px; margin-top: 5px;';
    input.onchange = () => {
      onChange(parseFloat(input.value) || 0);
    };
    parent.appendChild(input);
  }
}

