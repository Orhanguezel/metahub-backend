// src/modules/menuitem/price-resolver.ts
import type { ItemPrice, PriceChannel } from "./types";

type Ctx = { when?: Date; channel?: PriceChannel; qty?: number; outlet?: string };

export function pickApplicable(prices: ItemPrice[] = [], ctx: Ctx = {}) {
  const now = ctx.when ?? new Date();
  const qty = ctx.qty ?? 1;
  return prices.filter(p => {
    const inTime =
      (!p.activeFrom || now >= new Date(p.activeFrom)) &&
      (!p.activeTo   || now <= new Date(p.activeTo));
    const inQty = !p.minQty || qty >= p.minQty;
    const inChannel = !p.channels?.length || (ctx.channel && p.channels.includes(ctx.channel));
    const inOutlet  = !p.outlet || p.outlet === ctx.outlet;
    return inTime && inQty && inChannel && inOutlet;
  });
}

export function resolvePrice(prices: ItemPrice[] = [], ctx: Ctx = {}) {
  const appl = pickApplicable(prices, ctx);
  const base    = appl.find(p => p.kind === "base");
  const deposit = appl.find(p => p.kind === "deposit");
  const sur     = appl.filter(p => p.kind === "surcharge");
  const disc    = appl.filter(p => p.kind === "discount");

  const sum = (arr: ItemPrice[]) => arr.reduce((a, p) => a + (p.value?.amount || 0), 0);
  const total =
    (base?.value.amount || 0) +
    (deposit?.value.amount || 0) +
    sum(sur) - sum(disc);

  return { base, deposit, total };
}
