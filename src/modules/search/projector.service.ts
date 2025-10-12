// src/modules/search/projector.service.ts
import type { Model } from "mongoose";
import type { ISearchIndex, SearchDocType } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* -------------------------------------------------------
 * Helpers: array typing shims for TS 5.5+ (unknown values)
 * ----------------------------------------------------- */
function valuesOf(obj: Record<string, unknown> | Map<string, unknown>): string[] {
  const o = obj instanceof Map ? Object.fromEntries(obj) : obj;
  return Object.values(o).map(v => String(v ?? ""));
}
function entriesOf(obj: Record<string, unknown> | Map<string, unknown>): [string, string][] {
  const o = obj instanceof Map ? Object.fromEntries(obj) : obj;
  return Object.entries(o).map(([k, v]) => [k, String(v ?? "")]);
}

/* -------------------- Normalizer & Regex -------------------- */

export function normalizeText(...parts: Array<string | undefined | null>): string {
  const joined = parts
    .filter(Boolean)
    .map((s) =>
      String(s)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
    )
    .join(" ");
  return joined.replace(/\s+/g, " ").trim();
}

export function buildLooseRegex(q: string): RegExp {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tokens = escaped.split(/\s+/).filter(Boolean);
  const pattern = tokens.map((t) => `(?=.*${t})`).join("") + ".*";
  return new RegExp(pattern, "i");
}

/* -------------------- i18n / image / slug -------------------- */

type I18nObj = Record<string, string>;

export function ensureAllLocales(src?: I18nObj | Map<string, string>): I18nObj {
  const out: I18nObj = {};
  if (src instanceof Map) {
    for (const [k, v] of src.entries()) out[k] = String(v ?? "");
  } else if (src && typeof src === "object") {
    for (const k of Object.keys(src)) out[k] = String((src as any)[k] ?? "");
  }
  const base =
    (out.en && out.en.trim()) ||
    Object.values(out).find((v) => v && v.trim()) ||
    "";
  for (const lang of SUPPORTED_LOCALES as readonly string[]) {
    if (!out[lang] || !out[lang].trim()) out[lang] = base;
  }
  return out;
}

export function pickImageUrl(img: any): string | undefined {
  if (!img) return undefined;
  if (typeof img === "string") return img;
  return img.secure_url || img.url || img.webp || img.thumbnail || undefined;
}

/** i18n string seçimi (tr → en → ilk) */
export function pickLocalizedText(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") return val;
  if (val instanceof Map) {
    const obj = Object.fromEntries(val);
    return (obj.tr as string) || (obj.en as string) || (Object.values(obj)[0] as string | undefined);
  }
  if (typeof val === "object") {
    return val.tr || val.en || (Object.values(val).find((v) => typeof v === "string") as string | undefined);
  }
  return undefined;
}

/** slug: string veya i18n obje → ascii kebab-case string */
export function toSlug(val: any): string | undefined {
  const source = typeof val === "string" ? val : pickLocalizedText(val);
  if (!source) return undefined;
  const out = String(source)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return out || undefined;
}

/* -------------------- Upsert & Rebuild -------------------- */

export async function upsertSearchIndex(
  SearchIndex: Model<ISearchIndex>,
  doc: Partial<ISearchIndex> & { tenant: string; ref: { collection: string; id: any }; type: SearchDocType }
) {
  const titleObj = ensureAllLocales((doc.title || {}) as I18nObj);
  const subtitleObj = ensureAllLocales((doc.subtitle || {}) as I18nObj);
  const image = pickImageUrl((doc as any).image);
  const slug = toSlug((doc as any).slug);

  const searchable =
    doc.searchable ||
    normalizeText(
      ...(valuesOf(titleObj as Record<string, unknown>) as string[]),
      ...(valuesOf(subtitleObj as Record<string, unknown>) as string[]),
      slug,
      ...((doc.keywords || []) as string[]),
      doc.brand?.name,
      doc.category?.name
    );

  await SearchIndex.updateOne(
    { tenant: doc.tenant, "ref.collection": doc.ref.collection, "ref.id": doc.ref.id },
    {
      $set: {
        tenant: doc.tenant,
        ref: doc.ref,
        type: doc.type,
        slug, // string (veya undefined) – şema bunu trim/lowercase ile kabul eder
        title: new Map<string, string>(entriesOf(titleObj)),
        subtitle: new Map<string, string>(entriesOf(subtitleObj)),
        keywords: (doc.keywords || []) as string[],
        image,
        price_cents: doc.price_cents,
        offer_price_cents: doc.offer_price_cents,
        currency: doc.currency,
        brand: doc.brand,
        category: doc.category,
        searchable,
        boost: doc.boost ?? 1,
        isActive: doc.isActive ?? true,
      },
    },
    { upsert: true }
  );
}

export async function rebuildSearchIndexForTenant(
  tenant: string,
  models: {
    SearchIndex: Model<ISearchIndex>;
    Product?: any;
    Brand?: any;
    Category?: any;
  },
  types?: SearchDocType[]
) {
  const allow: SearchDocType[] = types && types.length ? types : ["product", "brand", "category"];

  await models.SearchIndex.deleteMany({ tenant, type: { $in: allow } });

  // Product
  if (allow.includes("product") && models.Product) {
    const products = await models.Product
      .find({ tenant, status: { $in: ["active", "published", "on_sale", true] } })
      .select("slug title name brand brandName category categories price_cents offer_price_cents currency images image")
      .lean();

    for (const p of products) {
      const title = ensureAllLocales((p.title || p.name || {}) as I18nObj);
      const brandName = pickLocalizedText(p.brandName || p.brand?.name);
      const catName = pickLocalizedText(p.category?.name || p.categories?.[0]?.name);

      const imgArray = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
      const firstImage = pickImageUrl(imgArray[0]);

      const slug =
        toSlug(p.slug) ||
        toSlug(pickLocalizedText(p.slug)) ||
        toSlug(title);

      await upsertSearchIndex(models.SearchIndex, {
        tenant,
        type: "product",
        ref: { collection: "product", id: p._id },
        slug,
        title,
        image: firstImage,
        price_cents: p.offer_price_cents || p.price_cents,
        offer_price_cents: p.offer_price_cents,
        currency: p.currency,
        brand: { id: p.brand?._id || p.brand, name: brandName },
        category: {
          id: p.category?._id || p.categories?.[0]?._id,
          path: p.categories?.[0]?.path || p.category?.path || [],
          name: catName,
        },
        keywords: [],
        boost: 5,
        isActive: true,
      });
    }
  }

  // Brand
  if (allow.includes("brand") && models.Brand) {
    const brands = await models.Brand
      .find({ tenant, status: { $in: ["active", true] } })
      .select("slug name logo image")
      .lean();

    for (const b of brands) {
      const title = ensureAllLocales((b.name || {}) as I18nObj);
      const img = pickImageUrl(b.logo || b.image);
      const slug = toSlug(b.slug) || toSlug(title);

      await upsertSearchIndex(models.SearchIndex, {
        tenant,
        type: "brand",
        ref: { collection: "brand", id: b._id },
        slug,
        title,
        image: img,
        boost: 2,
        isActive: true,
      });
    }
  }

  // Category
  if (allow.includes("category") && models.Category) {
    const cats = await models.Category
      .find({ tenant, isActive: true })
      .select("slug name path image")
      .lean();

    for (const c of cats) {
      const title = ensureAllLocales((c.name || {}) as I18nObj);
      const img = pickImageUrl(c.image);
      const slug = toSlug(c.slug) || toSlug(title);

      await upsertSearchIndex(models.SearchIndex, {
        tenant,
        type: "category",
        ref: { collection: "category", id: c._id },
        slug,
        title,
        image: img,
        category: { id: c._id, path: c.path || [], name: pickLocalizedText(c.name) },
        boost: 1,
        isActive: true,
      });
    }
  }
}
