import { Component } from './Component';

export class Health extends Component {
  public maxHealth: number = 100;
  public currentHealth: number = 100;
  public invulnerable: boolean = false;
  public invulnerableTime: number = 0;
  public onDeath?: () => void;
  public onDamage?: (amount: number) => void;
  public onHeal?: (amount: number) => void;

  takeDamage(amount: number): void {
    if (this.invulnerable || this.currentHealth <= 0) return;

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    if (this.onDamage) {
      this.onDamage(amount);
    }

    if (this.currentHealth <= 0) {
      if (this.onDeath) {
        this.onDeath();
      }
    }
  }

  heal(amount: number): void {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    if (this.onHeal) {
      this.onHeal(amount);
    }
  }

  isAlive(): boolean {
    return this.currentHealth > 0;
  }

  getHealthPercent(): number {
    return this.currentHealth / this.maxHealth;
  }

  clone(): Health {
    const health = new Health();
    health.maxHealth = this.maxHealth;
    health.currentHealth = this.currentHealth;
    health.invulnerable = this.invulnerable;
    health.invulnerableTime = this.invulnerableTime;
    return health;
  }
}

