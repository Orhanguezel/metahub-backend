import TaxRate, { ITaxRate } from "./models";

export type AddressLike = {
  country?: string;
  state?: string;
  city?: string;
  postal?: string;
};

/**
 * lean() dönen dokümanlarda Map alanlar POJO olur.
 * Bu nedenle name için Map | Record bir “like” tip tanımlıyoruz.
 */
type ITaxRateLike = Omit<ITaxRate, "name"> & {
  name?: Map<string, string> | Record<string, string>;
};

export async function resolveTaxRate(
  tenant: string,
  address: AddressLike,
  productTaxClass = "standard",
  when: Date = new Date()
): Promise<ITaxRateLike | null> {
  // normalize: karşılaştırmalar için upper/trim
  const addr = {
    country: address.country?.toUpperCase(),
    state: address.state?.toUpperCase(),
    city: address.city?.toUpperCase(),
    postal: address.postal?.trim(),
  };

  const base: any = {
    tenant,
    isActive: true,
    productTaxClass,
    $or: [{ startAt: { $exists: false } }, { startAt: { $lte: when } }],
    $and: [{ $or: [{ endAt: { $exists: false } }, { endAt: { $gte: when } }] }],
  };

  // lean ile düz obje alıyoruz (daha hızlı, Map -> Record olabilir)
  const candidates = await TaxRate.find(base).lean<ITaxRateLike[]>();

  const score = (r: ITaxRateLike) => {
    let s = 0;
    if (r.country && r.country.toUpperCase() === addr.country) s += 4;
    if (r.state && r.state.toUpperCase() === addr.state) s += 3;
    if (r.city && r.city.toUpperCase() === addr.city) s += 2;
    if (r.postal && addr.postal && addr.postal.startsWith(r.postal)) s += 1;
    s += (r.priority || 0) * 10; // priority daha ağırlıklı
    return s;
  };

  const sorted = candidates.sort((a, b) => score(b) - score(a));
  return sorted[0] || null;
}

export function calcTaxCents(
  taxableBaseCents: number,
  ratePct: number,
  isInclusive: boolean
): { tax_cents: number; base_ex_tax_cents: number } {
  const base = Math.max(0, Math.round(taxableBaseCents));
  const pct = Math.max(0, Math.min(100, ratePct));

  if (isInclusive) {
    // base = vergi dahil → vergi = base - base/(1+rate)
    const divisor = 1 + pct / 100;
    const exTax = Math.round(base / divisor);
    return { tax_cents: base - exTax, base_ex_tax_cents: exTax };
  } else {
    const tax = Math.round((base * pct) / 100);
    return { tax_cents: tax, base_ex_tax_cents: base };
  }
}
