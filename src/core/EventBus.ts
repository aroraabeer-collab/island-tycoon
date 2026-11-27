// Typed pub/sub — the contract between systems (economy, tycoon, vehicles, UI, audio).

export type VehicleKind = 'car' | 'boat' | 'air';

export interface GameEvents {
  moneyChanged: { money: number; delta: number };
  incomeChanged: { perSecond: number };
  collectorChanged: { pending: number };
  cashCollected: { amount: number; x: number; y: number; z: number; source: string };
  buttonPurchased: { id: string; label: string; x: number; y: number; z: number; animate: boolean };
  buttonsAvailable: { ids: string[] };
  purchaseDenied: { id: string };
  vehicleUnlocked: { kind: VehicleKind; tier: number; name: string };
  vehicleEntered: { kind: VehicleKind };
  vehicleExited: { kind: VehicleKind };
  toast: { text: string; icon?: string; kind?: 'info' | 'money' | 'unlock' | 'win' };
  activity: { kind: 'crate' | 'treasure' | 'rings' | 'trial'; state: 'spawned' | 'started' | 'progress' | 'done' | 'failed'; text?: string };
  win: Record<string, never>;
  splash: { x: number; z: number };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<any>>>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) { set = new Set(); this.handlers.set(type, set); }
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    this.handlers.get(type)?.forEach((fn) => fn(payload));
  }
}

export const bus = new EventBus();
