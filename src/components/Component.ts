export abstract class Component {
  public entityId: number = 0;
  public enabled: boolean = true;

  abstract clone(): Component;
}

