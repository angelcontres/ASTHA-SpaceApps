// Monitor de energía: activa solo el modo batería crítica (AC-TECH-02 §3, ADR-019 enmendado).
// Fuente: Battery Status API por EVENTOS (levelchange / chargingchange), nunca por sondeo (RNF-POW-01).
// En navegadores sin esa API (Firefox, Safari) el modo se puede disparar desde el Simulador; más adelante el Hub
// podrá retransmitir la señal del EPS de la nave por el mismo método `simulate`.
import { nextLowPower } from './powerPolicy';

interface BatteryLike extends EventTarget { level: number; charging: boolean }
type NavigatorWithBattery = Navigator & { getBattery?: () => Promise<BatteryLike> };

class PowerMonitor {
  level = $state<number | null>(null);
  charging = $state<boolean | null>(null);
  supported = $state(false);
  simulated = $state(false);
  low = $state(false);

  private battery: BatteryLike | null = null;
  private readonly onChange = () => this.read();

  /** Empieza a escuchar la batería. Devuelve la función de limpieza. Idempotente. */
  start(): () => void {
    const nav = globalThis.navigator as NavigatorWithBattery | undefined;
    if (!this.battery && nav?.getBattery) {
      nav.getBattery().then((b) => {
        this.battery = b;
        this.supported = true;
        b.addEventListener('levelchange', this.onChange);
        b.addEventListener('chargingchange', this.onChange);
        this.read();
      }).catch(() => { this.supported = false; });
    }
    return () => this.stop();
  }

  stop(): void {
    this.battery?.removeEventListener('levelchange', this.onChange);
    this.battery?.removeEventListener('chargingchange', this.onChange);
    this.battery = null;
  }

  /** Señal crítica simulada (demostración AC-TECH-02 o relé EPS). */
  simulate(on: boolean): void {
    this.simulated = on;
    this.evaluate();
  }

  private read(): void {
    if (!this.battery) return;
    this.level = this.battery.level;
    this.charging = this.battery.charging;
    this.evaluate();
  }

  private evaluate(): void {
    this.low = nextLowPower(this.low, { level: this.level, charging: this.charging, simulated: this.simulated });
  }
}

export const power = new PowerMonitor();
