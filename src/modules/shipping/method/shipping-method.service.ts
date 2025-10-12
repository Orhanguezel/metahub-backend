// src/modules/shipping/shipping-method.service.ts
import type { IShippingMethod, IShippingRateRow } from "../types";

/** tablo satırında koşul sağlanıyor mu? */
function rowMatches(row: IShippingRateRow, subtotal: number, weight: number) {
  const wOk =
    (row.minWeight == null || weight >= row.minWeight) &&
    (row.maxWeight == null || weight <= row.maxWeight);
  const sOk =
    (row.minSubtotal_cents == null || subtotal >= row.minSubtotal_cents) &&
    (row.maxSubtotal_cents == null || subtotal <= row.maxSubtotal_cents);
  return wOk && sOk;
}

export function computeQuoteCents(
  method: IShippingMethod,
  input: { subtotal_cents: number; weight_grams?: number }
): number {
  const subtotal = Math.max(0, Number(input.subtotal_cents || 0));
  const weight = Math.max(0, Number(input.weight_grams || 0));

  switch (method.calc) {
    case "flat": {
      const v = Number(method.flatPrice_cents || 0);
      return Math.max(0, v);
    }
    case "free_over": {
      const thr = Number(method.freeOver_cents || 0);
      if (thr > 0 && subtotal >= thr) return 0;
      const v = Number(method.flatPrice_cents || 0);
      return Math.max(0, v);
    }
    case "table": {
      const rows = method.table || [];
      const match = rows.find((r) => rowMatches(r, subtotal, weight));
      if (!match) return Number(method.flatPrice_cents || 0) || 0; // fallback
      return Math.max(0, Number(match.price_cents || 0));
    }
    default:
      return 0;
  }
}

/** config guard — admin create/update sırasında kontrol için */
export function validateCalcConfig(method: Partial<IShippingMethod>): boolean {
  if (!method.calc) return true;
  if (method.calc === "flat") return typeof method.flatPrice_cents === "number";
  if (method.calc === "free_over")
    return typeof method.flatPrice_cents === "number" && typeof method.freeOver_cents === "number";
  if (method.calc === "table")
    return Array.isArray(method.table) && method.table.length > 0;
  return false;
}
