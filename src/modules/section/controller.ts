import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/modules/section/i18n";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import type { SupportedLocale } from "@/types/common";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

/* ─────────────────────────────
 * 🔓 Public: Enabled section list
 *   GET /section
 *   Alias: GET /sections/published (uyumluluk)
 *   Filtreler:
 *     ?keys=hero,about
 *     ?zone=layout
 *     ?component=header
 *     ?components=header,footer,sidebar
 *     ?category=...
 * ───────────────────────────── */
export const getSectionsPublic = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = (req as any).locale || "en";
  const { Section } = await getTenantModels(req);

  const keysParam = String(req.query.keys || "").trim();
  const keys = keysParam ? keysParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const filter: any = { tenant: (req as any).tenant, enabled: true };

  if (keys.length) filter.sectionKey = { $in: keys };

  const zone = String(req.query.zone || "").trim();
  if (zone) filter.zone = zone;

  const component = String(req.query.component || "").trim();
  if (component) filter.component = component;

  const componentsParam = String(req.query.components || "").trim();
  if (componentsParam) {
    const arr = componentsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (arr.length) filter.component = { $in: arr };
  }

  const category = String(req.query.category || "").trim();
  if (category) filter.category = category;

  // Public projection (gerekirse daraltılabilir)
  const projection = {
    tenant: 0,
    roles: 0,
    __v: 0,
    // id’yi saklamak isterseniz _id: 0 yapmayın
  };

  const sections = await Section.find(filter, projection)
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(200).json({
    success: true,
    message: t("public.section.fetchedAll", locale, translations),
    data: sections,
  });
});

/* ─────────────────────────────
 * 🔐 Admin: Create
 *   POST /section
 * ───────────────────────────── */
export const createSection = asyncHandler(async (req: Request, res: Response) => {
  const { Section } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "en";

  const {
    sectionKey,
    zone,
    component,
    category,
    icon = "MdViewModule",
    label,
    description,
    variant,
    enabled = true,
    order = 0,
    roles = [],
    params = {},
    required = false,
  } = req.body || {};

  // tenant + sectionKey benzersiz
  const existing = await Section.findOne({
    tenant: (req as any).tenant,
    sectionKey,
  }).lean();
  if (existing) {
    res.status(409).json({
      success: false,
      message: t("admin.section.sectionKeyExists", locale, translations, { sectionKey }),
    });
    return;
  }

  const doc = await Section.create({
    tenant: (req as any).tenant,
    sectionKey,
    zone,
    component,
    category,
    icon,
    label: label ? fillAllLocales(label) : {},
    description: description ? fillAllLocales(description) : {},
    variant,
    enabled,
    order,
    roles,
    params,
    required,
  });

  logger.withReq.info(req, `[Section] Created: ${sectionKey}`, {
    module: "section",
    user: (req as any).user?.name || (req as any).user?.email || "system",
  });

  res.status(201).json({
    success: true,
    message: t("admin.section.created", locale, translations, { sectionKey }),
    data: doc,
  });
});

/* ─────────────────────────────
 * 🔐 Admin: Full list (tenant) + sayfalama + filtre
 *   GET /section/admin?page=1&limit=20&sort=order:asc,createdAt:asc
 *   + ?zone=...&component=...&category=...
 * ───────────────────────────── */
export const getSectionsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { Section } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "en";

  const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit || "20"), 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  // sort param örn: "order:asc,createdAt:asc"
  const sortParam = String(req.query.sort || "").trim();
  const sort: Record<string, 1 | -1> = {};
  if (sortParam) {
    for (const pair of sortParam.split(",")) {
      const [k, dir] = pair.split(":");
      if (k) sort[k.trim()] = dir?.toLowerCase() === "desc" ? -1 : 1;
    }
  } else {
    sort["order"] = 1;
    sort["createdAt"] = 1;
  }

  const filter: any = { tenant: (req as any).tenant };

  const zone = String(req.query.zone || "").trim();
  if (zone) filter.zone = zone;

  const component = String(req.query.component || "").trim();
  if (component) filter.component = component;

  const category = String(req.query.category || "").trim();
  if (category) filter.category = category;

  const [items, total] = await Promise.all([
    Section.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Section.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: t("admin.section.fetchedAll", locale, translations),
    data: {
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      sort,
      filter,
    },
  });
});

/* ─────────────────────────────
 * 🔐 Admin: Update by sectionKey
 *   PUT /section/:sectionKey
 * ───────────────────────────── */
export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const { Section } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "en";
  const { sectionKey } = req.params;

  const allowed = new Set([
    "zone",
    "component",
    "category",
    "icon",
    "label",
    "description",
    "variant",
    "enabled",
    "order",
    "roles",
    "params",
    "required",
  ]);

  const updates: Record<string, any> = {};
  for (const [k, v] of Object.entries(req.body || {})) {
    if (allowed.has(k)) updates[k] = v;
  }

  if (updates.label) updates.label = fillAllLocales(updates.label);
  if (updates.description) updates.description = fillAllLocales(updates.description);

  const doc = await Section.findOneAndUpdate(
    { tenant: (req as any).tenant, sectionKey },
    { $set: updates },
    { new: true }
  );

  if (!doc) {
    res.status(404).json({
      success: false,
      message: t("admin.section.notFound", locale, translations, { sectionKey }),
    });
    return;
  }

  logger.withReq.info(req, `[Section] Updated: ${sectionKey}`, {
    module: "section",
    user: (req as any).user?.name || (req as any).user?.email || "system",
  });

  res.json({
    success: true,
    message: t("admin.section.updated", locale, translations, { sectionKey }),
    data: doc,
  });
});

/* ─────────────────────────────
 * 🔐 Admin: Toggle enabled
 *   PATCH /section/:sectionKey/toggle
 * ───────────────────────────── */
export const toggleSection = asyncHandler(async (req: Request, res: Response) => {
  const { Section } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "en";
  const { sectionKey } = req.params;

  const doc = await Section.findOne({ tenant: (req as any).tenant, sectionKey });
  if (!doc) {
    res.status(404).json({
      success: false,
      message: t("admin.section.notFound", locale, translations, { sectionKey }),
    });
    return;
  }

  doc.enabled = !doc.enabled;
  await doc.save();

  res.json({
    success: true,
    message: doc.enabled
      ? t("admin.section.enabled", locale, translations, { sectionKey })
      : t("admin.section.disabled", locale, translations, { sectionKey }),
    data: doc,
  });
});

/* ─────────────────────────────
 * 🔐 Admin: Delete by sectionKey
 *   DELETE /section/:sectionKey
 * ───────────────────────────── */
export const deleteSection = asyncHandler(async (req: Request, res: Response) => {
  const { Section } = await getTenantModels(req);
  const locale: SupportedLocale = (req as any).locale || "en";
  const { sectionKey } = req.params;

  const deleted = await Section.findOneAndDelete({
    tenant: (req as any).tenant,
    sectionKey,
  });

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: t("admin.section.notFound", locale, translations, { sectionKey }),
    });
    return;
  }

  logger.withReq.info(req, `[Section] Deleted: ${sectionKey}`, {
    module: "section",
    user: (req as any).user?.name || (req as any).user?.email || "system",
  });

  res.json({
    success: true,
    message: t("admin.section.deleted", locale, translations, { sectionKey }),
  });
});
