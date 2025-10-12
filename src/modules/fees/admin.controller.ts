// admin.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n";
import { isValidObjectId } from "@/core/middleware/auth/validation";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common"; // ⬅️ burada common’dan al

const tByReq = (req: Request) => (k: string) =>
  translate(k, (req as any).locale || getLogLocale(), translations);

const parseIfJson = (v: any) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return v; } };
const toLowerCode = (s?: string) => (s ? String(s).trim().toLowerCase() : s);
const toUpper = (s?: string) => (s ? String(s).trim().toUpperCase() : s);

// Map → plain object çevirici (gelen/önceki name için)
function mapLikeToObj(m?: any): Record<string, string> {
  if (!m) return {};
  if (m instanceof Map) return Object.fromEntries(m);
  if (typeof m.toObject === "function") return m.toObject();
  return { ...m };
}

// 🔸 Tüm dillerin dolu olmasını garanti eder
function ensureAllLocales(
  inputName: any,
  preferred: string | undefined,                 // req.locale veya logLocale
  prev?: Record<string, string> | Map<string, string>
) {
  const incoming = parseIfJson(inputName) || {};
  const previous = mapLikeToObj(prev);
  const merged: Record<string, string> = { ...previous, ...incoming };

  // base (fallback) değeri seç
  const pref = (preferred || "").split("-")[0] as SupportedLocale | "";
  const firstNonEmpty =
    Object.values(merged).find((v) => typeof v === "string" && v.trim()) || "";

  const base =
    (pref && merged[pref]) ||
    merged["tr"] ||
    merged["en"] ||
    firstNonEmpty ||
    "";

  // tüm SUPPORTED_LOCALES’i doldur
  const out: Record<SupportedLocale, string> = {} as any;
  for (const l of SUPPORTED_LOCALES) {
    const v = merged[l];
    out[l] = typeof v === "string" && v.trim() ? v : String(base);
  }
  return out;
}

/* ===== CREATE ===== */
export const createFeeRule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { FeeRule } = await getTenantModels(req);

  const payload = { ...(req.body || {}) };
  (payload as any).tenant = (req as any).tenant;
  if (payload.code) payload.code = toLowerCode(payload.code);
  if (payload.currency) payload.currency = toUpper(payload.currency);
  if (payload.appliesWhen) payload.appliesWhen = parseIfJson(payload.appliesWhen);

  // ✅ name’i tüm dillerle tamamla
  payload.name = ensureAllLocales(payload.name, (req as any).locale || getLogLocale());

  const exists = await FeeRule.findOne({ tenant: (req as any).tenant, code: payload.code }).lean();
  if (exists) {
    res.status(400).json({ success: false, message: t("alreadyExists") });
    return;
  }

  const doc = await FeeRule.create(payload);
  res.status(201).json({ success: true, message: t("created"), data: doc });
});

/* ===== UPDATE ===== */
export const updateFeeRule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { FeeRule } = await getTenantModels(req);
  const doc = await FeeRule.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const up = { ...(req.body || {}) };
  if (up.code) up.code = toLowerCode(up.code);
  if (up.currency) up.currency = toUpper(up.currency);
  if (up.appliesWhen !== undefined) up.appliesWhen = parseIfJson(up.appliesWhen);

  // ✅ name geldiyse, mevcut ile birleştirerek tüm dilleri tamamla
  if (up.name !== undefined) {
    up.name = ensureAllLocales(up.name, (req as any).locale || getLogLocale(), doc.name as any);
  }

  if (up.code && up.code !== doc.code) {
    const exists = await FeeRule.findOne({ tenant: (req as any).tenant, code: up.code }).lean();
    if (exists) {
      res.status(400).json({ success: false, message: t("alreadyExists") });
      return;
    }
  }

  const updatable = [
    "code", "name", "isActive", "currency", "mode", "amount", "percent", "min_cents", "max_cents", "appliesWhen",
  ] as const;

  for (const k of updatable) {
    if ((up as any)[k] !== undefined) (doc as any)[k] = (up as any)[k];
  }

  await doc.save();
  res.status(200).json({ success: true, message: t("updated"), data: doc });
});



/* ===== DELETE ===== */
export const deleteFeeRule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { FeeRule } = await getTenantModels(req);
  const doc = await FeeRule.findOne({ _id: id, tenant: (req as any).tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  res.status(200).json({ success: true, message: t("deleted") });
  return;
});

/* ===== ADMIN LIST ===== */
export const adminGetFees = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { FeeRule } = await getTenantModels(req);

  const {
    q, lang = "tr", isActive, currency, mode, when, limit = "200", sort = "code_asc",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: (req as any).tenant };
  if (typeof isActive === "string") filter.isActive = isActive === "true";
  if (currency) filter.currency = String(currency).toUpperCase();
  if (mode) filter.mode = mode;

  if (when) {
    // when can be single or array (stringified)
    const arr = Array.isArray(when) ? when : parseIfJson(when);
    const list = Array.isArray(arr) ? arr : [when];
    filter.appliesWhen = { $in: list };
  }

  if (q && q.trim()) {
    const rex = { $regex: q.trim(), $options: "i" };
    filter.$or = [{ code: rex }, { [`name.${lang}`]: rex }];
  }

  const sortMap: Record<string, any> = {
    code_asc: { code: 1, createdAt: -1 },
    code_desc: { code: -1, createdAt: -1 },
    created_desc: { createdAt: -1 },
    created_asc: { createdAt: 1 },
  };

  const items = await FeeRule.find(filter)
    .limit(Math.min(Number(limit) || 200, 500))
    .sort(sortMap[sort] || sortMap.code_asc)
    .lean();

  res.status(200).json({ success: true, message: t("listFetched"), data: items });
  return;
});

/* ===== GET BY ID ===== */
export const adminGetFeeById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("validation.invalidObjectId") });
    return;
  }

  const { FeeRule } = await getTenantModels(req);
  const doc = await FeeRule.findOne({ _id: id, tenant: (req as any).tenant }).lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
  return;
});
