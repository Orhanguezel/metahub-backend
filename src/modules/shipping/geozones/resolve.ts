// src/modules/shipping/resolve.ts
import type { Model } from "mongoose";
import type { Request } from "express";
import type { IShippingGeoZone } from "./geozones.models";

type Addr = { country?: string; state?: string; city?: string; postal?: string };

const norm = (s?: string) => String(s || "").trim();
const lc   = (s?: string) => norm(s).toLowerCase();

function matchPattern(pattern: string, value: string) {
  const v = norm(value);
  const p = norm(pattern);
  if (!p) return false;
  // aralık: "34000-34999"
  const range = p.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const n = Number(v); if (!Number.isFinite(n)) return false;
    return n >= Number(range[1]) && n <= Number(range[2]);
  }
  // wildcard: "34*" veya "34???"
  if (/[*?]/.test(p)) {
    const rx = new RegExp("^" + p.replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
    return rx.test(v);
  }
  // regex: "^34\\d{3}$"
  if (p.startsWith("^")) {
    try { return new RegExp(p).test(v); } catch { return false; }
  }
  // düz eşitlik
  return v === p;
}

export async function resolveZoneId(
  req: Request,
  ShippingGeoZoneModel: Model<IShippingGeoZone>,
  addr: Addr
): Promise<string | undefined> {
  const q = { tenant: req.tenant, isActive: true } as any;
  const candidates = await ShippingGeoZoneModel.find(q).sort({ priority: -1, createdAt: 1 }).lean();

  let best: { z: IShippingGeoZone; score: number } | null = null;

  for (const z of candidates) {
    // kaba ön-filtre: ülke eşleşmesi zorunlu olsun (liste boşsa global kabul)
    if (z.countries?.length) {
      if (!z.countries.map(lc).includes(lc(addr.country))) continue;
    }
    // skorlayalım
    let s = 0;
    if (z.countries?.length) s += 4;
    if (z.states?.length && z.states.map(lc).includes(lc(addr.state))) s += 3;

    if (z.postalInc?.length && addr.postal && z.postalInc.some(p => matchPattern(p, addr.postal!))) s += 3;
    if (z.postalExc?.length && addr.postal && z.postalExc.some(p => matchPattern(p, addr.postal!))) s -= 4;

    if (z.citiesInc?.length && z.citiesInc.map(lc).includes(lc(addr.city))) s += 2;
    if (z.citiesExc?.length && z.citiesExc.map(lc).includes(lc(addr.city))) s -= 3;

    // priority tie-break zaten sort’ta; yine de skor eşitse büyük prioriy’yi tercih edelim
    if (!best || s > best.score) best = { z, score: s };
  }

  return best?.z ? String((best.z as any)._id) : undefined;
}
