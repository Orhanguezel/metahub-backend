import type { Types, Model } from "mongoose";
import type {
  IMenuItem,
  IMenuItemModifierGroup,
  IMenuItemVariant,
  ItemPrice,
  PriceKind,
} from "@/modules/menuitem/types";
import type { IPriceListItem as UPriceListItem } from "@/modules/pricelist/types";

/* -------------------- primitives -------------------- */
export const norm = (s?: string) => String(s || "").trim().toLowerCase();
export const numOr0 = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const pickFirstNumber = (...vals: any[]) => {
  for (const v of vals) {
    const n = numOr0(v);
    if (n > 0) return n;
  }
  return 0;
};

export function coalesceStreetLike(a?: { street?: string; addressLine?: string; houseNumber?: string }) {
  const street = (a?.street || "").trim();
  if (street) return street;
  const line = (a?.addressLine || "").trim();
  const hn = (a?.houseNumber || "").trim();
  return [line, hn].filter(Boolean).join(" ").trim();
}

/* -------------------- price helpers -------------------- */
export const pickEmbeddedPriceAmount = (prices?: ItemPrice[], kind: PriceKind = "surcharge"): number => {
  if (!Array.isArray(prices) || prices.length === 0) return 0;
  const now = new Date();

  const candidates = prices.filter((p) => {
    const startOk = !p.activeFrom || (p.activeFrom instanceof Date ? p.activeFrom : new Date(p.activeFrom)) <= now;
    const endOk = !p.activeTo || (p.activeTo instanceof Date ? p.activeTo : new Date(p.activeTo)) >= now;
    return startOk && endOk && (p.kind === kind || (kind === "surcharge" && p.kind === "base"));
  });

  if (candidates.length === 0) return 0;

  candidates.sort((a, b) => {
    const q = (b.minQty ?? 0) - (a.minQty ?? 0);
    if (q !== 0) return q;
    const af =
      (b.activeFrom ? +new Date(b.activeFrom as any) : 0) - (a.activeFrom ? +new Date(a.activeFrom as any) : 0);
    return af;
  });

  return Number(candidates[0]?.value?.amount) || 0;
};

async function getPLIPrice(
  PriceListItem: Model<UPriceListItem>,
  id?: string | Types.ObjectId,
  fallbackCurrency: string = "TRY"
): Promise<{ price: number; currency: string }> {
  if (!id) return { price: 0, currency: fallbackCurrency };

  const pli = await PriceListItem.findById(id)
    .select({ price: 1, amount: 1, currency: 1 })
    .lean<{ price?: number; amount?: number; currency?: string }>();

  const price = numOr0(pli?.price ?? pli?.amount);
  return { price, currency: pli?.currency || fallbackCurrency };
}

/* -------------------- menu helpers -------------------- */
export type ModifierSelection = { groupCode: string; optionCode: string; quantity?: number };

function variantMatches(v: IMenuItemVariant, key?: string) {
  const k = norm(key);
  if (!k) return false;
  if (norm((v as any).code) === k) return true;
  if (norm((v as any).slug) === k) return true;

  const name = (v as any).name || {};
  for (const lang of Object.keys(name)) if (norm(name[lang]) === k) return true;

  const size = (v as any).sizeLabel || {};
  for (const lang of Object.keys(size)) if (norm(size[lang]) === k) return true;

  return false;
}

function enforceModifierRules(
  item: IMenuItem,
  selections: ModifierSelection[]
): { ok: true } | { ok: false; errorKey: string } {
  const groups = item.modifierGroups || [];
  if (!groups.length && !selections.length) return { ok: true };

  const byGroup = new Map<string, ModifierSelection[]>();
  for (const sel of selections) {
    if (!byGroup.has(sel.groupCode)) byGroup.set(sel.groupCode, []);
    byGroup.get(sel.groupCode)!.push(sel);
  }

  for (const g of groups) {
    const min = Math.max(0, Number(g.minSelect ?? (g.isRequired ? 1 : 0)));
    const max = Number.isFinite(g.maxSelect as any) ? Number(g.maxSelect) : Infinity;

    const chosen = (byGroup.get(g.code) || []).filter(Boolean);
    const qtySum = chosen.reduce((s, c) => s + Math.max(1, Number(c.quantity || 1)), 0);
    const count = qtySum;

    if (g.isRequired && count < 1) return { ok: false, errorKey: "menu.error.modifierRequiredMissing" };
    if (count < min) return { ok: false, errorKey: "menu.error.modifierMinNotMet" };
    if (count > max) return { ok: false, errorKey: "menu.error.modifierMaxExceeded" };

    for (const sel of chosen) {
      const valid = (g.options || []).some((o) => o.code === sel.optionCode);
      if (!valid) return { ok: false, errorKey: "menu.error.modifierOptionInvalid" };
    }
  }
  return { ok: true };
}

/* -------------------- pricing for menu line -------------------- */
export async function priceMenuLine(
  MenuItemModel: Model<IMenuItem>,
  PriceListItemModel: Model<UPriceListItem>,
  menuItemId: string,
  tenant: string,
  variantCode?: string,
  modifierSelections: ModifierSelection[] = [],
  depositIncluded = true,
  fallbackCurrency: string = "TRY"
): Promise<
  | {
      unitPrice: number;
      unitCurrency: string;
      priceComponents: {
        base: number;
        deposit: number;
        modifiersTotal: number;
        modifiers: Array<{ code: string; qty: number; unitPrice: number; total: number }>;
        currency: string;
      };
      snapshot: {
        name?: Record<string, string>;
        variantName?: Record<string, string>;
        sizeLabel?: Record<string, string>;
        image?: string;
        allergens?: Array<{ key: string; value: Record<string, string> }>;
        additives?: Array<{ key: string; value: Record<string, string> }>;
        dietary?: { vegetarian?: boolean; vegan?: boolean; containsAlcohol?: boolean; spicyLevel?: number };
      };
      selectedVariantCode?: string;
    }
  | { error: string }
> {
  const mi = await MenuItemModel.findOne({ _id: menuItemId, tenant }).lean<IMenuItem>();
  if (!mi) return { error: "menu.error.menuItemNotFound" };

  const variants = (Array.isArray(mi.variants) ? mi.variants : []).filter((v: any) => v?.isActive !== false);
  let variant: IMenuItemVariant | undefined =
    variantCode ? variants.find((v) => variantMatches(v, variantCode)) : undefined;
  if (!variant) variant = variants.find((v: any) => !!v?.isDefault) || (variants.length === 1 ? variants[0] : undefined);
  if (!variant && variants.length > 1) return { error: "menu.error.variantRequired" };

  const ruleCheck = enforceModifierRules(mi, modifierSelections);
  if ("errorKey" in ruleCheck) return { error: ruleCheck.errorKey };

  // --- Fiyatlar
  let currency = (fallbackCurrency || "TRY").toUpperCase();

  // BASE
  let base = 0;
  if ((variant as any)?.priceListItem) {
    const res = await getPLIPrice(PriceListItemModel, (variant as any).priceListItem, currency);
    base = res.price;
    currency = res.currency || currency;
  } else {
    base =
      pickEmbeddedPriceAmount((variant as any)?.prices, "base") ||
      pickFirstNumber((variant as any)?.price, (variant as any)?.amount, (mi as any)?.basePrice);
  }

  // DEPOSIT
  let deposit = 0;
  if (depositIncluded) {
    if ((variant as any)?.depositPriceListItem) {
      const res = await getPLIPrice(PriceListItemModel, (variant as any).depositPriceListItem, currency);
      deposit = res.price;
      currency = res.currency || currency;
    } else {
      deposit =
        pickEmbeddedPriceAmount((variant as any)?.prices, "deposit") ||
        pickFirstNumber((variant as any)?.deposit, (mi as any)?.deposit);
    }
  }

  // MODIFIERS
  let modifiersTotal = 0;
  const modifiers: Array<{ code: string; qty: number; unitPrice: number; total: number }> = [];

  for (const sel of modifierSelections) {
    const g = (mi.modifierGroups || []).find((x: IMenuItemModifierGroup) => x.code === sel.groupCode);
    if (!g) return { error: "menu.error.modifierGroupNotFound" };

    const opt = (g.options || []).find((o) => o.code === sel.optionCode);
    if (!opt) return { error: "menu.error.modifierOptionNotFound" };

    let optUnit = 0;
    if ((opt as any).priceListItem) {
      const res = await getPLIPrice(PriceListItemModel, (opt as any).priceListItem, currency);
      optUnit = res.price;
      currency = res.currency || currency;
    } else {
      optUnit = pickEmbeddedPriceAmount((opt as any)?.prices, "surcharge");
    }

    const qty = Math.max(1, numOr0(sel.quantity || 1));
    const total = optUnit * qty;
    modifiersTotal += total;
    modifiers.push({ code: `${g.code}:${(opt as any).code}`, qty, unitPrice: optUnit, total });
  }

  const unitPrice = base + deposit + modifiersTotal;

  const snapshot = {
    name: mi.name || undefined,
    variantName: (variant as any)?.name || undefined,
    sizeLabel: (variant as any)?.sizeLabel || undefined,
    image: (mi as any).images?.[0]?.thumbnail || (mi as any).images?.[0]?.url || undefined,
    allergens: (mi as any).allergens?.map((x: any) => ({ key: x.key, value: x.value })) || [],
    additives: (mi as any).additives?.map((x: any) => ({ key: x.key, value: x.value })) || [],
    dietary: (mi as any).dietary
      ? {
          vegetarian: !!(mi as any).dietary.vegetarian,
          vegan: !!(mi as any).dietary.vegan,
          containsAlcohol: !!(mi as any).dietary.containsAlcohol,
          spicyLevel: typeof (mi as any).dietary.spicyLevel === "number" ? (mi as any).dietary.spicyLevel : undefined,
        }
      : undefined,
  };

  const finalCurrency = (currency || fallbackCurrency || "TRY").toUpperCase();

  return {
    unitPrice,
    unitCurrency: finalCurrency,
    priceComponents: {
      base,
      deposit,
      modifiersTotal,
      modifiers,
      currency: finalCurrency,
    },
    snapshot,
    selectedVariantCode: (variant as any)?.code || undefined,
  };
}
