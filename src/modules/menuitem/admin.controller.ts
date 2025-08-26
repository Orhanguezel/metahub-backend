// src/modules/menuitem/admin.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { Types } from "mongoose";

import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";

// ⬇ food label helpers (tek kaynak kullan)
import {
  ADDITIVE_KEYS,
  ALLERGEN_KEYS,
  ADDITIVE_MAP,
  ALLERGEN_MAP,
} from "@/modules/menuitem/constants/foodLabels";

/* ========= helpers ========= */
const parseIfJson = (v: any) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return v;
  }
};
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(
    k,
    (req.locale as SupportedLocale) || getLogLocale(),
    translations as any,
    p
  );

const stringifyIdsDeep = (obj: any): any => {
  if (obj == null) return obj;
  if (obj instanceof Types.ObjectId) return obj.toString();
  if (Array.isArray(obj)) return obj.map(stringifyIdsDeep);
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) obj[k] = stringifyIdsDeep(obj[k]);
    return obj;
  }
  return obj;
};

/* ----- KV normalize (CSV destekli + i18n auto value) ----- */
const splitCSV = (s: string) =>
  String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const tlFromCode = (
  kind: "allergens" | "additives",
  code: string
): Record<SupportedLocale, string> => {
  // ALLERGEN_MAP/ADDITIVE_MAP zaten tüm diller dolu TranslatedLabel döner
  return (kind === "allergens"
    ? (ALLERGEN_MAP as any)[code]
    : (ADDITIVE_MAP as any)[code]) as Record<SupportedLocale, string>;
};

const normKVGeneric = (raw: any, kind: "allergens" | "additives") => {
  const allowed = new Set<string>(
    kind === "allergens"
      ? (ALLERGEN_KEYS as readonly string[])
      : (ADDITIVE_KEYS as readonly string[])
  );

  const toEntry = (code: string) =>
    allowed.has(code) ? { key: code, value: tlFromCode(kind, code) } : undefined;

  const v = parseIfJson(raw);

  // Dizi: [{key,value}, ...]
  if (Array.isArray(v)) {
    return v
      .map((x: any) => {
        const key = typeof x?.key === "string" ? x.key.trim() : undefined;
        if (!key || !allowed.has(key)) return undefined;
        const value =
          x?.value && typeof x.value === "object"
            ? fillAllLocales(x.value)
            : tlFromCode(kind, key);
        return { key, value };
      })
      .filter(Boolean);
  }

  // Tek obje: { key: "a,b,c" } veya { key:"a", value:{...} }
  if (v && typeof v === "object" && typeof v.key === "string") {
    const keys = splitCSV(v.key).filter((k) => allowed.has(k));
    if (!keys.length) return undefined;

    if (keys.length > 1) {
      return keys.map((k) => toEntry(k)).filter(Boolean);
    }

    const only = keys[0];
    const value =
      v.value && typeof v.value === "object"
        ? fillAllLocales(v.value)
        : tlFromCode(kind, only);
    return [{ key: only, value }];
  }

  // Ham CSV: "a,b,c" / "1,2,3"
  if (typeof v === "string") {
    const keys = splitCSV(v).filter((k) => allowed.has(k));
    if (!keys.length) return undefined;
    return keys.map((k) => toEntry(k)).filter(Boolean);
  }

  return undefined;
};

const normAllergens = (raw: any) => normKVGeneric(raw, "allergens");
const normAdditives = (raw: any) => normKVGeneric(raw, "additives");

// --- Categories normalize ---
const normCategories = (raw: any) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;

  const normalized = arr.map((x: any) => {
    if (typeof x === "string") return { category: x };
    return x;
  });

  return normalized
    .map((x: any) => ({
      category: Types.ObjectId.isValid(x?.category) ? x.category : undefined,
      order:
        Number.isInteger(x?.order) ||
        (typeof x?.order === "string" && Number.isFinite(Number(x.order)))
          ? Number(x.order)
          : undefined,
      isFeatured: typeof x?.isFeatured === "boolean" ? x.isFeatured : undefined,
    }))
    .filter((x: any) => !!x.category);
};

/* ----- prices normalize (yeni) ----- */
const PRICE_KINDS = ["base", "deposit", "surcharge", "discount"] as const;
const CHANNELS = ["delivery", "pickup", "dinein"] as const;
type Channel = (typeof CHANNELS)[number];
const isChannel = (x: unknown): x is Channel =>
  typeof x === "string" && (CHANNELS as readonly string[]).includes(x);

const asDate = (v: any) => {
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : undefined;
};

const ALLOWED_CURRENCIES = new Set(["EUR", "TRY", "USD"] as const);

const normMoney = (v: any) => {
  const m = parseIfJson(v) || {};
  const toNumber = (x: any) =>
    typeof x === "number"
      ? x
      : typeof x === "string" && x.trim() !== ""
      ? Number(x)
      : NaN;

  const amount = toNumber(m?.amount);
  const rawCur =
    typeof m?.currency === "string" ? String(m.currency).toUpperCase() : undefined;
  const currency =
    rawCur && ALLOWED_CURRENCIES.has(rawCur as any) ? rawCur : "TRY";
  const taxIncluded = typeof m?.taxIncluded === "boolean" ? m.taxIncluded : undefined;

  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return { amount, currency, taxIncluded };
};

const normPrices = (raw: any) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;

  const toChannels = (val: any): Channel[] | undefined => {
    if (val == null) return undefined;
    if (Array.isArray(val)) {
      const filtered = (val as unknown[]).filter(isChannel);
      return filtered.length ? filtered : undefined;
    }
    return isChannel(val) ? [val] : undefined;
  };

  return arr
    .map((p: any) => {
      const kind =
        typeof p?.kind === "string" && PRICE_KINDS.includes(p.kind)
          ? p.kind
          : undefined;
      const value = normMoney(p?.value);
      const listRef = Types.ObjectId.isValid(p?.listRef) ? p.listRef : undefined;
      const activeFrom = p?.activeFrom ? asDate(p.activeFrom) : undefined;
      const activeTo = p?.activeTo ? asDate(p.activeTo) : undefined;
      const minQty =
        Number.isInteger(p?.minQty) && p.minQty >= 0 ? p.minQty : undefined;

      const channels = toChannels(p?.channels);

      const outlet = typeof p?.outlet === "string" ? p.outlet.trim() : undefined;
      const note = typeof p?.note === "string" ? p.note.trim() : undefined;

      return kind && value
        ? {
            kind,
            value,
            listRef,
            activeFrom,
            activeTo,
            minQty,
            channels,
            outlet,
            note,
          }
        : undefined;
    })
    .filter(Boolean);
};

/* ----- variants normalize ----- */
const normVariants = (raw: any) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;
  return arr
    .map((v: any) => ({
      code: typeof v?.code === "string" ? v.code.trim() : undefined,
      name: fillAllLocales(v?.name),
      order:
        Number.isInteger(v?.order) ||
        (typeof v?.order === "string" && Number.isFinite(Number(v.order)))
          ? Number(v.order)
          : undefined,
      isDefault: typeof v?.isDefault === "boolean" ? v.isDefault : undefined,
      sku: v?.sku,
      barcode: v?.barcode,
      sizeLabel: fillAllLocales(v?.sizeLabel),
      volumeMl:
        typeof v?.volumeMl === "number" ||
        (typeof v?.volumeMl === "string" && v.volumeMl !== "")
          ? Number(v.volumeMl)
          : undefined,
      netWeightGr:
        typeof v?.netWeightGr === "number" ||
        (typeof v?.netWeightGr === "string" && v.netWeightGr !== "")
          ? Number(v.netWeightGr)
          : undefined,

      /* yeni: gömülü fiyatlar */
      prices: normPrices(v?.prices) || [],

      /* opsiyonel: eski referanslar */
      priceListItem: Types.ObjectId.isValid(v?.priceListItem)
        ? v.priceListItem
        : undefined,
      depositPriceListItem: Types.ObjectId.isValid(v?.depositPriceListItem)
        ? v.depositPriceListItem
        : undefined,
    }))
    .filter((v: any) => !!v.code);
};

/* ----- modifier groups normalize ----- */
const normModifierGroups = (raw: any) => {
  const arr = parseIfJson(raw);
  if (!Array.isArray(arr)) return undefined;
  return arr
    .map((g: any) => {
      const options = Array.isArray(g?.options)
        ? g.options
            .map((o: any) => ({
              code: typeof o?.code === "string" ? o.code.trim() : undefined,
              name: fillAllLocales(o?.name),
              order:
                Number.isInteger(o?.order) ||
                (typeof o?.order === "string" && Number.isFinite(Number(o.order)))
                  ? Number(o.order)
                  : undefined,
              isDefault: typeof o?.isDefault === "boolean" ? o.isDefault : undefined,

              /* yeni: gömülü fiyatlar */
              prices: normPrices(o?.prices) || [],

              /* opsiyonel: eski referans */
              priceListItem: Types.ObjectId.isValid(o?.priceListItem)
                ? o.priceListItem
                : undefined,
            }))
            .filter((o: any) => !!o.code)
        : [];
      return {
        code: typeof g?.code === "string" ? g.code.trim() : undefined,
        name: fillAllLocales(g?.name),
        order:
          Number.isInteger(g?.order) ||
          (typeof g?.order === "string" && Number.isFinite(Number(g.order)))
            ? Number(g.order)
            : undefined,
        minSelect:
          Number.isInteger(g?.minSelect) ||
          (typeof g?.minSelect === "string" && g.minSelect !== "")
            ? Number(g.minSelect)
            : undefined,
        maxSelect:
          Number.isInteger(g?.maxSelect) ||
          (typeof g?.maxSelect === "string" && g.maxSelect !== "")
            ? Number(g.maxSelect)
            : undefined,
        isRequired: typeof g?.isRequired === "boolean" ? g.isRequired : undefined,
        options,
      };
    })
    .filter((g: any) => !!g.code);
};

/** Cloudinary URL transform */
const withCdnBase = (url: string) =>
  url.replace("/upload/", "/upload/f_auto,q_auto/");
const withCdnThumb = (url: string) =>
  url.replace("/upload/", "/upload/c_fill,w_400,h_400,q_auto,f_auto/");

/* ================ CREATE ================ */
export const createMenuItem = asyncHandler(
  async (req: Request, res: Response) => {
    const t = tByReq(req);
    const { MenuItem } = await getTenantModels(req);

    try {
      const files: Express.Multer.File[] = (req.files as any) || [];

      const {
        code,
        slug,
        name,
        description,
        categories,
        variants,
        modifierGroups,
        allergens,
        additives,
        dietary,
        ops,
        sku,
        barcode,
        taxCode,
        isPublished,
        isActive,
      } = req.body || {};

      if (!code || !String(code).trim()) {
        res
          .status(400)
          .json({ success: false, message: t("validation.codeRequired") });
        return;
      }

      const baseName = fillAllLocales(parseIfJson(name));
      const baseDesc = fillAllLocales(parseIfJson(description));

      const categoriesArr = normCategories(categories) || [];
      const variantsArr = normVariants(variants) || [];
      const modifiersArr = normModifierGroups(modifierGroups) || [];
      const allergensArr = normAllergens(allergens) || [];
      const additivesArr = normAdditives(additives) || [];

      if (!variantsArr.length) {
        res
          .status(400)
          .json({ success: false, message: t("validation.variantsInvalid") });
        return;
      }

      // images (Cloudinary / local)
      const images: any[] = [];
      for (const file of files) {
        const imageUrl: string | undefined =
          (file as any).path ||
          (file as any).secure_url ||
          (file as any).url ||
          getImagePath(file);
        if (!imageUrl) continue;

        const isRemote = /^https?:\/\//i.test(imageUrl);
        let thumbnail: string;
        let webp: string | undefined;

        if (isRemote) {
          thumbnail = withCdnThumb(imageUrl);
          webp = withCdnBase(imageUrl);
        } else {
          ({ thumbnail, webp } = getFallbackThumbnail(imageUrl));
          if (shouldProcessImage()) {
            const processed = await processImageLocal(
              (file as any).path,
              (file as any).filename,
              path.dirname((file as any).path)
            );
            thumbnail = processed.thumbnail;
            webp = processed.webp;
          }
        }

        images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }

      const loc: SupportedLocale =
        (req.locale as SupportedLocale) || getLogLocale();
      const fallbackName = baseName?.[loc] || baseName?.en || code;
      const finalSlug = slug
        ? slugify(slug, { lower: true, strict: true })
        : slugify(fallbackName, { lower: true, strict: true });

      const doc = await MenuItem.create({
        tenant: req.tenant,
        code: String(code).trim(),
        slug: finalSlug,
        name: baseName,
        description: baseDesc,
        images,
        categories: categoriesArr,
        variants: variantsArr,
        modifierGroups: modifiersArr,
        allergens: allergensArr,
        additives: additivesArr,
        dietary: parseIfJson(dietary),
        ops: parseIfJson(ops),
        sku,
        barcode,
        taxCode,
        isPublished:
          isPublished === undefined
            ? true
            : isPublished === "true" || isPublished === true,
        isActive:
          isActive === undefined
            ? true
            : isActive === "true" || isActive === true,
      });

      logger.withReq.info(req, t("created"), {
        ...getRequestContext(req),
        id: doc._id,
        images: images.length,
      });
      res
        .status(201)
        .json({ success: true, message: t("created"), data: doc.toJSON() });
    } catch (err: any) {
      logger.withReq.error(req, t("error.create_fail"), {
        ...getRequestContext(req),
        event: "menuitem.create",
        error: err?.message,
      });
      res
        .status(500)
        .json({ success: false, message: t("error.create_fail") });
    }
  }
);

/* ================ UPDATE ================ */
export const updateMenuItem = asyncHandler(
  async (req: Request, res: Response) => {
    const t = tByReq(req);
    const { id } = req.params;

    const { MenuItem } = await getTenantModels(req);
    const doc = await MenuItem.findOne({ _id: id, tenant: req.tenant });
    if (!doc) {
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    const files: Express.Multer.File[] = (req.files as any) || [];
    const {
      code,
      slug,
      name,
      description,
      categories,
      variants,
      modifierGroups,
      allergens,
      additives,
      dietary,
      ops,
      sku,
      barcode,
      taxCode,
      isPublished,
      isActive,
      removedImages,
      existingImagesOrder,
    } = req.body || {};

    if (code !== undefined) (doc as any).code = String(code).trim();
    if (slug !== undefined)
      (doc as any).slug = slugify(String(slug), { lower: true, strict: true });
    if (name !== undefined)
      (doc as any).name = fillAllLocales(parseIfJson(name));
    if (description !== undefined)
      (doc as any).description = fillAllLocales(parseIfJson(description));

    if (categories !== undefined)
      (doc as any).categories = normCategories(categories) || [];
    if (variants !== undefined)
      (doc as any).variants = normVariants(variants) || [];
    if (modifierGroups !== undefined)
      (doc as any).modifierGroups = normModifierGroups(modifierGroups) || [];

    if (allergens !== undefined)
      (doc as any).allergens = normAllergens(allergens) || [];
    if (additives !== undefined)
      (doc as any).additives = normAdditives(additives) || [];

    if (dietary !== undefined) (doc as any).dietary = parseIfJson(dietary);
    if (ops !== undefined) (doc as any).ops = parseIfJson(ops);

    if (sku !== undefined) (doc as any).sku = sku;
    if (barcode !== undefined) (doc as any).barcode = barcode;
    if (taxCode !== undefined) (doc as any).taxCode = taxCode;

    if (isPublished !== undefined)
      (doc as any).isPublished =
        isPublished === "true" || isPublished === true;
    if (isActive !== undefined)
      (doc as any).isActive = isActive === "true" || isActive === true;

    // add images (Cloudinary / local)
    if (files.length > 0) {
      for (const file of files) {
        const imageUrl: string | undefined =
          (file as any).path ||
          (file as any).secure_url ||
          (file as any).url ||
          getImagePath(file);
        if (!imageUrl) continue;

        const isRemote = /^https?:\/\//i.test(imageUrl);
        let thumbnail: string;
        let webp: string | undefined;

        if (isRemote) {
          thumbnail = withCdnThumb(imageUrl);
          webp = withCdnBase(imageUrl);
        } else {
          ({ thumbnail, webp } = getFallbackThumbnail(imageUrl));
          if (shouldProcessImage()) {
            const processed = await processImageLocal(
              (file as any).path,
              (file as any).filename,
              path.dirname((file as any).path)
            );
            thumbnail = processed.thumbnail;
            webp = processed.webp;
          }
        }

        (doc as any).images.push({
          url: imageUrl,
          thumbnail,
          webp,
          publicId: (file as any).public_id,
        });
      }
    }

    // remove images (hem string[] URL hem {url, publicId}[])
    if (removedImages) {
      try {
        const parsed =
          typeof removedImages === "string"
            ? JSON.parse(removedImages)
            : removedImages;
        let urls: string[] = [];
        let publicIds: string[] = [];
        if (Array.isArray(parsed)) {
          if (parsed.length && typeof parsed[0] === "string") {
            urls = parsed as string[];
          } else {
            urls = parsed.map((x: any) => x?.url).filter(Boolean);
            publicIds = parsed.map((x: any) => x?.publicId).filter(Boolean);
          }
        }
        const toDelete = new Set(urls);
        (doc as any).images = (doc as any).images.filter(
          (img: any) => !toDelete.has(img.url)
        );

        for (const url of urls) {
          const localPath = path.join(
            "uploads",
            req.tenant,
            "menuitem-images",
            path.basename(url)
          );
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
        for (const pid of publicIds) {
          try {
            await cloudinary.uploader.destroy(pid);
          } catch {}
        }
      } catch {
        res
          .status(400)
          .json({ success: false, message: t("validation.imageRemoveInvalid") });
        return;
      }
    }

    // reorder (existingImagesOrder: string[] of publicId|url)
    if (existingImagesOrder) {
      try {
        const orderSig: string[] =
          typeof existingImagesOrder === "string"
            ? JSON.parse(existingImagesOrder)
            : existingImagesOrder;
        const map = new Map<string, any>();
        for (const img of (doc as any).images || []) {
          const key = img.publicId || img.url;
          if (key) map.set(String(key), img);
        }
        const next: any[] = [];
        for (const k of orderSig) {
          const hit = map.get(String(k));
          if (hit) {
            next.push(hit);
            map.delete(String(k));
          }
        }
        (doc as any).images = [...next, ...Array.from(map.values())];
      } catch {}
    }

    await doc.save();
    logger.withReq.info(req, t("updated"), {
      ...getRequestContext(req),
      id: doc._id,
    });
    res
      .status(200)
      .json({ success: true, message: t("updated"), data: doc.toJSON() });
  }
);

/* ================ LIST (admin) ================ */
export const adminGetAllMenuItem = asyncHandler(
  async (req: Request, res: Response) => {
    const t = tByReq(req);
    const { MenuItem } = await getTenantModels(req);

    const {
      q,
      isActive,
      isPublished,
      category,
      vegetarian,
      vegan,
      containsAlcohol,
      service, // delivery|pickup|dinein
      limit = "200",
    } = req.query as Record<string, string>;

    const filter: Record<string, any> = { tenant: req.tenant };
    if (isActive != null) filter.isActive = isActive === "true";
    if (isPublished != null) filter.isPublished = isPublished === "true";
    if (category) filter["categories.category"] = category;

    if (vegetarian != null)
      filter["dietary.vegetarian"] = vegetarian === "true";
    if (vegan != null) filter["dietary.vegan"] = vegan === "true";
    if (containsAlcohol != null)
      filter["dietary.containsAlcohol"] = containsAlcohol === "true";

    if (service && ["delivery", "pickup", "dinein"].includes(service)) {
      filter[`ops.availability.${service}`] = true;
    }

    if (q && q.trim()) {
      const qx = q.trim();
      filter.$or = [
        { code: { $regex: qx, $options: "i" } },
        { slug: { $regex: qx, $options: "i" } },
        ...SUPPORTED_LOCALES.map((lng) => ({
          [`name.${lng}`]: { $regex: qx, $options: "i" },
        })),
        ...SUPPORTED_LOCALES.map((lng) => ({
          [`description.${lng}`]: { $regex: qx, $options: "i" },
        })),
        ...SUPPORTED_LOCALES.map((lng) => ({
          [`variants.name.${lng}`]: { $regex: qx, $options: "i" },
        })),
      ];
    }

    const list = await (MenuItem as any)
      .find(filter)
      .populate([
        { path: "categories.category", select: "code slug name images order" },
      ])
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 200, 500))
      .lean({ virtuals: true, getters: true });

    logger.withReq.info(req, t("listFetched"), {
      ...getRequestContext(req),
      resultCount: list.length,
    });
    res.status(200).json({
      success: true,
      message: t("listFetched"),
      data: stringifyIdsDeep(list),
    });
  }
);

/* ================ GET BY ID (admin) ================ */
export const adminGetMenuItemById = asyncHandler(
  async (req: Request, res: Response) => {
    const t = tByReq(req);
    const { MenuItem } = await getTenantModels(req);
    const { id } = req.params;

    const doc = await (MenuItem as any)
      .findOne({ _id: id, tenant: req.tenant })
      .populate([
        { path: "categories.category", select: "code slug name images order" },
      ])
      .lean();

    if (!doc) {
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }
    res.status(200).json({
      success: true,
      message: t("fetched"),
      data: stringifyIdsDeep(doc),
    });
  }
);

/* ================ DELETE ================ */
export const deleteMenuItem = asyncHandler(
  async (req: Request, res: Response) => {
    const t = tByReq(req);
    const { MenuItem } = await getTenantModels(req);
    const { id } = req.params;

    const doc = await MenuItem.findOne({ _id: id, tenant: req.tenant });
    if (!doc) {
      res.status(404).json({ success: false, message: t("notFound") });
      return;
    }

    for (const img of (doc as any).images || []) {
      const localPath = path.join(
        "uploads",
        req.tenant,
        "menuitem-images",
        path.basename(img.url)
      );
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if ((img as any).publicId) {
        try {
          await cloudinary.uploader.destroy((img as any).publicId);
        } catch {}
      }
    }

    await doc.deleteOne();
    logger.withReq.info(req, t("deleted"), {
      ...getRequestContext(req),
      id,
    });
    res.status(200).json({ success: true, message: t("deleted") });
  }
);
