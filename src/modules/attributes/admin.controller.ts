import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { isValidObjectId } from "@/core/middleware/auth/validation";

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const toUpperUnderscore = (s: string) => String(s || "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");

const normalizeValues = (vals: any[]) =>
  (Array.isArray(vals) ? vals : []).map((v) => ({
    code: toUpperUnderscore(v?.code || ""),
    label: parseIfJson(v?.label) || {},
    hex: v?.hex,
    sort: Number.isFinite(v?.sort) ? Number(v.sort) : 0,
    isActive: v?.isActive !== false,
  }));

/* ===== CREATE ===== */
export const createAttribute = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { ProductAttribute } = await getTenantModels(req);

  const payload = { ...(req.body || {}) };
  payload.tenant = (req as any).tenant;
  payload.code = toUpperUnderscore(payload.code);
  payload.name = parseIfJson(payload.name) || {};
  if (payload.values) payload.values = normalizeValues(parseIfJson(payload.values));

  // new fields
  if (typeof payload.group === "string") payload.group = payload.group.trim() || undefined;
  if (payload.sort != null) payload.sort = Number(payload.sort);
  if (!Number.isFinite(payload.sort)) payload.sort = 0;

  // unique guard: tenant+code
  const exists = await ProductAttribute.findOne({ tenant: (req as any).tenant, code: payload.code }).lean();
  if (exists) {
    res.status(400).json({ success: false, message: t("alreadyExists") });
    return;
  }

  const doc = await ProductAttribute.create(payload);
  res.status(201).json({ success: true, message: t("created"), data: doc });
});

/* ===== UPDATE ===== */
export const updateAttribute = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { ProductAttribute } = await getTenantModels(req);
  const doc = await ProductAttribute.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const up = { ...(req.body || {}) };
  if (typeof up.code === "string") (up as any).code = toUpperUnderscore(up.code);
  if (up.name) (up as any).name = parseIfJson(up.name);
  if (up.values !== undefined) (up as any).values = normalizeValues(parseIfJson(up.values));

  // new fields
  if (up.group !== undefined) (doc as any).group = typeof up.group === "string" ? up.group.trim() : up.group;
  if (up.sort !== undefined) (doc as any).sort = Number(up.sort);

  // code değiştiyse unique guard
  if (up.code && up.code !== doc.code) {
    const exists = await ProductAttribute.findOne({ tenant: (req as any).tenant, code: up.code }).lean();
    if (exists) {
      res.status(400).json({ success: false, message: t("alreadyExists") });
      return;
    }
  }

  const updatable = ["code","name","type","values","isActive","group","sort"] as const;
  for (const k of updatable) if ((up as any)[k] !== undefined) (doc as any)[k] = (up as any)[k];

  await doc.save();
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});

/* ===== DELETE ===== */
export const deleteAttribute = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { ProductAttribute } = await getTenantModels(req);
  const doc = await ProductAttribute.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  res.status(200).json({ success: true, message: t("deleted") });
});

/* ===== ADMIN LIST ===== */
export const adminGetAttributes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { ProductAttribute } = await getTenantModels(req);

  const {
    q, lang = "tr", type, isActive, group, limit = "200", sort = "code_asc",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: (req as any).tenant };
  if (type) filter.type = type;
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (group) filter.group = group;

  if (q && q.trim()) {
    const rex = { $regex: q.trim(), $options: "i" };
    filter.$or = [
      { code: rex },
      { [`name.${lang}`]: rex },
      { "values.code": rex },
      { [`values.label.${lang}`]: rex },
    ];
  }

  const sortMap: Record<string, any> = {
    code_asc: { code: 1, createdAt: -1 },
    code_desc: { code: -1, createdAt: -1 },
    created_desc: { createdAt: -1 },
    created_asc: { createdAt: 1 },
    sort_asc: { sort: 1, createdAt: -1 },
    sort_desc: { sort: -1, createdAt: -1 },
  };

  const list = await ProductAttribute.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort(sortMap[sort] || sortMap.code_asc)
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

/* ===== GET BY ID ===== */
export const adminGetAttributeById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { ProductAttribute } = await getTenantModels(req);
  const doc = await ProductAttribute.findOne({ _id: id, tenant: (req as any).tenant }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
