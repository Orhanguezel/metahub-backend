import type { AddressLike, ITaxRate } from "./types";
import type { IGeoZone } from "./types";

/** Vergi hesaplama (minor units/cents bazlı) */
export function calcTaxCents(
  taxableBaseCents: number,
  ratePct: number,
  isInclusive: boolean
): { tax_cents: number; base_ex_tax_cents: number } {
  const base = Math.max(0, Math.round(taxableBaseCents));
  const pct = Math.max(0, Math.min(100, Number(ratePct) || 0));

  if (isInclusive) {
    // base = vergi dahil ⇒ vergi = base - base/(1+rate)
    const divisor = 1 + pct / 100;
    const exTax = Math.round(base / divisor);
    return { tax_cents: base - exTax, base_ex_tax_cents: exTax };
  }
  const tax = Math.round((base * pct) / 100);
  return { tax_cents: tax, base_ex_tax_cents: base };
}

/** Basit skorlayıcı: adres ile geozone eşleşmesi */
export function scoreZone(addr: AddressLike, z?: IGeoZone | null): number {
  if (!z) return 0;
  let s = 0;

  const inArr = (a?: string, arr?: string[]) =>
    !!(a && Array.isArray(arr) && arr.includes(a));

  if (inArr(addr.country, z.countries)) s += 4;
  if (inArr(addr.state, z.states)) s += 3;

  if (addr.postal && Array.isArray(z.postalCodes)) {
    // prefix match / wildcard benzeri basit eşleşme
    const hit = z.postalCodes.some(p => addr.postal!.startsWith(String(p)));
    if (hit) s += 2;
  }
  return s;
}
