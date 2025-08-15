import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";
import { isValidObjectId } from "@/core/utils/validation";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { t as translate } from "@/core/utils/i18n/translate";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { mergeLocalesForUpdate } from "@/core/utils/i18n/mergeLocalesForUpdate";

/* ---------- helpers ---------- */
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const safeParse = <T>(v: unknown): T | undefined => {
  try { return typeof v === "string" ? (JSON.parse(v) as T) : (v as T); } catch { return undefined; }
};

/** Partial -> full Record<SupportedLocale,string> */
const toFullLocaleRecord = (
  obj?: Partial<Record<SupportedLocale, string>>
): Record<SupportedLocale, string> => {
  const out = {} as Record<SupportedLocale, string>;
  for (const lng of SUPPORTED_LOCALES) out[lng] = (obj?.[lng] ?? "") as string;
  return out;
};

/* ================= CREATE ================= */
export const createNeighborhood = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  try {
    const { Neighborhood } = await getTenantModels(req);

    const name = fillAllLocales(safeParse<Record<SupportedLocale, string> | Partial<Record<SupportedLocale, string>>>(req.body.name) || req.body.name);
    const bodySlug = typeof req.body.slug === "string" ? req.body.slug : "";
    const slug = bodySlug ? slugify(bodySlug, { lower: true, strict: true }) : undefined;

    const payload = {
      name,
      tenant: req.tenant,
      slug, // model pre-validate yoksa name’den üretir
      city: req.body.city || undefined,
      district: req.body.district || undefined,
      zip: req.body.zip || undefined,
      codes: safeParse<Record<string, any>>(req.body.codes) || req.body.codes || undefined,
      geo: safeParse<Record<string, any>>(req.body.geo) || req.body.geo || undefined,
      aliases: Array.isArray(req.body.aliases) ? req.body.aliases : safeParse<string[]>(req.body.aliases),
      tags: Array.isArray(req.body.tags) ? req.body.tags : safeParse<string[]>(req.body.tags),
      sortOrder:
        typeof req.body.sortOrder === "number" ? req.body.sortOrder :
        typeof req.body.sortOrder === "string" ? Number(req.body.sortOrder) || 0 : 0,
      isActive:
        typeof req.body.isActive === "boolean"
          ? req.body.isActive
          : req.body.isActive === "true"
          ? true
          : req.body.isActive === "false"
          ? false
          : true,
    };

    const doc = await Neighborhood.create(payload);

    logger.withReq.info(req, t("neighborhood.create.success"), {
      ...getRequestContext(req),
      id: doc._id,
      slug: doc.slug,
      module: "neighborhood",
      event: "neighborhood.create",
    });

    res.status(201).json({ success: true, message: t("neighborhood.create.success"), data: doc });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({
        success: false,
        message: translate("neighborhood.duplicate", req.locale || getLogLocale(), translations),
      });
      return;
    }
    logger.withReq.error(req, t("neighborhood.create.error"), {
      ...getRequestContext(req), error: err?.message, module: "neighborhood", event: "neighborhood.create",
    });
    res.status(500).json({ success: false, message: t("neighborhood.create.error") });
  }
});

/* ================= LIST (admin) ================= */
export const adminGetNeighborhoods = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  try {
    const { Neighborhood } = await getTenantModels(req);

    const {
      isActive, city, district, zip, q, tag, limit = "200", cityCode, districtCode,
    } = req.query;

    const filter: Record<string, any> = { tenant: req.tenant };

    if (typeof isActive === "string") filter.isActive = isActive === "true";
    if (typeof city === "string") filter.city = city;
    if (typeof district === "string") filter.district = district;
    if (typeof zip === "string") filter.zip = zip;
    if (typeof cityCode === "string") filter["codes.cityCode"] = cityCode;
    if (typeof districtCode === "string") filter["codes.districtCode"] = districtCode;
    if (typeof tag === "string" && tag.trim()) filter.tags = tag.trim();

    if (typeof q === "string" && q.trim()) {
      const qx = q.trim();
      filter.$or = [
        { slug: { $regex: qx, $options: "i" } },
        // isimlerin tüm dillerinde ara
        ...SUPPORTED_LOCALES.map((lng) => ({ [`name.${lng}`]: { $regex: qx, $options: "i" } })),
        { aliases: { $elemMatch: { $regex: qx, $options: "i" } } },
      ];
    }

    const list = await Neighborhood.find(filter)
      .limit(Math.min(Number(limit) || 200, 500))
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    logger.withReq.info(req, t("neighborhood.list.success"), {
      ...getRequestContext(req), resultCount: list.length, module: "neighborhood", event: "neighborhood.list",
    });

    res.status(200).json({ success: true, message: t("neighborhood.list.success"), data: list });
  } catch (err: any) {
    logger.withReq.error(req, t("neighborhood.list.error"), {
      ...getRequestContext(req), error: err?.message, module: "neighborhood", event: "neighborhood.list",
    });
    res.status(500).json({ success: false, message: t("neighborhood.list.error") });
  }
});

/* ================= GET BY ID ================= */
export const adminGetNeighborhoodById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("neighborhood.invalidId") }); return;
  }

  const { Neighborhood } = await getTenantModels(req);
  const doc = await Neighborhood.findOne({ _id: id, tenant: req.tenant }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("neighborhood.notFound") }); return;
  }
  res.status(200).json({ success: true, message: t("neighborhood.fetch.success"), data: doc });
});

/* ================= UPDATE ================= */
export const updateNeighborhood = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("neighborhood.invalidId") }); return;
  }

  try {
    const { Neighborhood } = await getTenantModels(req);
    const doc = await Neighborhood.findOne({ _id: id, tenant: req.tenant });
    if (!doc) { res.status(404).json({ success: false, message: t("neighborhood.notFound") }); return; }

    /* ---- name merge (type-safe) ---- */
    if (req.body.name) {
      const incomingRaw = safeParse<Partial<Record<SupportedLocale, string>>>(req.body.name) ?? req.body.name;
      const merged = mergeLocalesForUpdate(
        toFullLocaleRecord(doc.name as Partial<Record<SupportedLocale, string>>),
        toFullLocaleRecord(incomingRaw as Partial<Record<SupportedLocale, string>>)
      );
      // mergeLocalesForUpdate tam Record döner; doc.name opsiyonel alan kabul ettiği için direkt atayabiliriz
      (doc as any).name = merged;
    }

    if (typeof req.body.slug === "string" && req.body.slug.trim()) {
      doc.slug = slugify(req.body.slug, { lower: true, strict: true });
    }

    if (typeof req.body.isActive === "boolean") doc.isActive = req.body.isActive;
    else if (typeof req.body.isActive === "string") doc.isActive = req.body.isActive === "true";

    ["city", "district", "zip"].forEach((k) => {
      if (typeof (req.body as any)[k] === "string") (doc as any)[k] = (req.body as any)[k];
    });

    const codes = safeParse<Record<string, any>>(req.body.codes);
    if (codes && typeof codes === "object") (doc as any).codes = codes;
    const geo = safeParse<Record<string, any>>(req.body.geo);
    if (geo && typeof geo === "object") (doc as any).geo = geo;

    const aliases = Array.isArray(req.body.aliases) ? req.body.aliases : safeParse<string[]>(req.body.aliases);
    if (Array.isArray(aliases)) (doc as any).aliases = aliases;

    const tags = Array.isArray(req.body.tags) ? req.body.tags : safeParse<string[]>(req.body.tags);
    if (Array.isArray(tags)) (doc as any).tags = tags;

    if (req.body.sortOrder !== undefined) {
      const so = typeof req.body.sortOrder === "string" ? Number(req.body.sortOrder) : req.body.sortOrder;
      if (!Number.isNaN(so as number)) (doc as any).sortOrder = so as number;
    }

    await doc.save();

    logger.withReq.info(req, t("neighborhood.update.success"), {
      ...getRequestContext(req), id, module: "neighborhood", event: "neighborhood.update",
    });

    res.status(200).json({ success: true, message: t("neighborhood.update.success"), data: doc });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({
        success: false,
        message: translate("neighborhood.duplicate", req.locale || getLogLocale(), translations),
      });
      return;
    }
    logger.withReq.error(req, t("neighborhood.update.error"), {
      ...getRequestContext(req), error: err?.message, module: "neighborhood", event: "neighborhood.update",
    });
    res.status(500).json({ success: false, message: t("neighborhood.update.error") });
  }
});

/* ================= DELETE ================= */
export const deleteNeighborhood = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("neighborhood.invalidId") }); return;
  }

  const { Neighborhood } = await getTenantModels(req);
  const deleted = await Neighborhood.findOneAndDelete({ _id: id, tenant: req.tenant });

  if (!deleted) { res.status(404).json({ success: false, message: t("neighborhood.notFound") }); return; }

  logger.withReq.info(req, t("neighborhood.delete.success"), {
    ...getRequestContext(req), id, module: "neighborhood", event: "neighborhood.delete",
  });

  res.status(200).json({ success: true, message: t("neighborhood.delete.success") });
});
