// Basit modül durum kayıt defteri
export type LazyStatus = "idle" | "loading" | "ready" | "failed" | "open"; // open = circuit açık
export type LazyInfo = {
  name: string;
  status: LazyStatus;
  attempts: number;
  loadMs?: number;
  lastLoadedAt?: number;
  lastError?: string;
  failCount?: number;      // ardışık hata sayısı
  openedAt?: number;       // circuit açık zamanı
  cooldownUntil?: number;  // bir sonraki deneme zamanı (epoch ms)
};

const registry = new Map<string, LazyInfo>();

export function ensureEntry(name: string) {
  if (!registry.has(name)) {
    registry.set(name, { name, status: "idle", attempts: 0, failCount: 0 });
  }
}

export function setStatus(name: string, next: Partial<LazyInfo>) {
  ensureEntry(name);
  const prev = registry.get(name)!;
  registry.set(name, { ...prev, ...next, name });
}

export function getStatus(name: string): LazyInfo {
  ensureEntry(name);
  return registry.get(name)!;
}

export function getAllStatuses(): LazyInfo[] {
  return Array.from(registry.values()).sort((a, b) => a.name.localeCompare(b.name));
}
