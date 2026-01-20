export class Health {
  public current: number;
  public max: number;
  public onDeath?: () => void;
  public onDamage?: (amount: number) => void;
  public onHeal?: (amount: number) => void;

  constructor(max: number = 100) {
    this.max = max;
    this.current = max;
  }

  damage(amount: number): void {
    this.current = Math.max(0, this.current - amount);
    if (this.onDamage) {
      this.onDamage(amount);
    }
    if (this.current <= 0 && this.onDeath) {
      this.onDeath();
    }
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
    if (this.onHeal) {
      this.onHeal(amount);
    }
  }

  isDead(): boolean {
    return this.current <= 0;
  }
}

