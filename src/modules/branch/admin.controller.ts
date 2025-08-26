import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import translations from "./i18n";

/* ================== Helpers ================== */

const parseIfJson = (v: any) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return v;
  }
};

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const isHHmm = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s));

const normalizeOpeningHours = (v: any) => {
  const arr = parseIfJson(v);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((r) => ({
      day: Number(r?.day),
      open: String(r?.open ?? ""),
      close: String(r?.close ?? ""),
    }))
    .filter(
      (r) =>
        Number.isInteger(r.day) &&
        r.day >= 0 &&
        r.day <= 6 &&
        isHHmm(r.open) &&
        isHHmm(r.close)
    )
    .sort((a, b) => a.day - b.day);
};

const isPolygonCoords = (v: any): v is number[][][] =>
  Array.isArray(v) &&
  v.every(
    (ring) =>
      Array.isArray(ring) &&
      ring.every(
        (pt) =>
          Array.isArray(pt) &&
          pt.length === 2 &&
          typeof pt[0] === "number" &&
          typeof pt[1] === "number"
      )
  );

const normalizeDeliveryZones = (v: any) => {
  const arr = parseIfJson(v);
  if (!Array.isArray(arr)) return [];
  const ALLOWED = ["TRY", "EUR", "USD"];
  return arr
    .map((z) => {
      const coords = z?.polygon?.coordinates;
      const safeCoords = isPolygonCoords(coords) ? coords : [];
      const currency = String(z?.fee?.currency ?? "TRY");
      return {
        name: z?.name ? String(z.name).trim() : undefined,
        polygon: {
          type: "Polygon" as const,
          coordinates: safeCoords,
        },
        fee: {
          amount: Number(z?.fee?.amount ?? 0),
          currency: (ALLOWED.includes(currency) ? currency : "TRY") as "TRY" | "EUR" | "USD",
        },
      };
    })
    .filter((z) => z.polygon.coordinates.length > 0);
};

const normalizeLocation = (v: any) => {
  const loc = parseIfJson(v);
  const coords = loc?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return { type: "Point" as const, coordinates: [lng, lat] as [number, number] };
    }
  }
  return undefined;
};

const normalizeAddress = (v: any) => {
  const a = parseIfJson(v);
  if (!a || typeof a !== "object") return undefined;
  return {
    street: a.street ?? undefined,
    number: a.number ?? undefined,
    district: a.district ?? undefined,
    city: a.city ?? undefined,
    state: a.state ?? undefined,
    zip: a.zip ?? undefined,
    country: a.country ?? undefined,
    fullText: a.fullText ?? undefined,
  };
};

/* ================= CREATE ================= */
export const createBranch = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Branch } = await getTenantModels(req);

  try {
    const {
      code,
      name,
      address,
      location,
      services,
      openingHours,
      minPrepMinutes,
      deliveryZones,
      isActive,
    } = req.body || {};

    if (!code || typeof code !== "string" || !code.trim()) {
      res.status(400).json({ success: false, message: t("validation.codeRequired") });
      return;
    }

    const loc = normalizeLocation(location);
    if (!loc) {
      res.status(400).json({ success: false, message: t("validation.locationRequired") });
      return;
    }

    if (!Array.isArray(services) || services.length === 0) {
      res.status(400).json({ success: false, message: t("validation.servicesRequired") });
      return;
    }

    const oh = normalizeOpeningHours(openingHours);
    const dz = normalizeDeliveryZones(deliveryZones);

    const doc = await Branch.create({
      tenant: req.tenant,
      code: String(code).trim(),
      name: fillAllLocales(parseIfJson(name)),
      address: normalizeAddress(address),
      location: loc,
      services,
      openingHours: oh,
      minPrepMinutes:
        typeof minPrepMinutes === "number" && Number.isFinite(minPrepMinutes)
          ? minPrepMinutes
          : undefined,
      deliveryZones: dz,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    logger.withReq.info(req, t("created"), { ...getRequestContext(req), id: doc._id });
    res.status(201).json({ success: true, message: t("created"), data: doc.toJSON() });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "branch.create",
      error: err?.message,
      bodyKeys: Object.keys(req.body || {}),
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

/* ================= UPDATE ================= */
export const updateBranch = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const { Branch } = await getTenantModels(req);
  const doc = await Branch.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  try {
    const {
      code,
      name,
      address,
      location,
      services,
      openingHours,
      minPrepMinutes,
      deliveryZones,
      isActive,
    } = req.body || {};

    if (code !== undefined) doc.set("code", String(code).trim());
    if (name !== undefined) doc.set("name", fillAllLocales(parseIfJson(name)));
    if (address !== undefined) doc.set("address", normalizeAddress(address));

    if (location !== undefined) {
      const loc = normalizeLocation(location);
      if (!loc) {
        res.status(400).json({ success: false, message: t("validation.locationRequired") });
        return;
      }
      doc.set("location", loc);
    }

    if (services !== undefined) doc.set("services", services);

    if (openingHours !== undefined) {
      const oh = normalizeOpeningHours(openingHours);
      doc.set("openingHours", oh);
    }

    if (minPrepMinutes !== undefined) {
      const v = Number(minPrepMinutes);
      doc.set("minPrepMinutes", Number.isFinite(v) ? v : undefined);
    }

    if (deliveryZones !== undefined) {
      const dz = normalizeDeliveryZones(deliveryZones);
      doc.set("deliveryZones", dz);
    }

    if (isActive !== undefined) doc.set("isActive", !!isActive);

    await doc.save();

    logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
    res.status(200).json({ success: true, message: t("updated"), data: doc.toJSON() });
  } catch (err: any) {
    logger.withReq.error(req, t("error.update_fail") || "Update failed", {
      ...getRequestContext(req),
      event: "branch.update",
      error: err?.message,
      bodyKeys: Object.keys(req.body || {}),
    });
    res.status(500).json({ success: false, message: t("error.update_fail") || "Update failed" });
  }
});

/* ================= LIST (admin) ================= */
export const adminGetAllBranch = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Branch } = await getTenantModels(req);

  const {
    q,
    service, // "delivery|pickup|dinein"
    isActive,
    nearLng,
    nearLat,
    nearRadius,
    limit = "200",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };
  if (isActive != null) filter.isActive = isActive === "true";

  if (service && ["delivery", "pickup", "dinein"].includes(service)) {
    filter.services = service;
  }

  if (q && q.trim()) {
    const qx = q.trim();
    filter.$or = [
      { code: { $regex: qx, $options: "i" } },
      ...SUPPORTED_LOCALES.map((lng) => ({
        [`name.${lng}`]: { $regex: qx, $options: "i" },
      })),
      { "address.fullText": { $regex: qx, $options: "i" } },
    ];
  }

  if (nearLng && nearLat) {
    const lng = Number(nearLng),
      lat = Number(nearLat);
    const radius = Number(nearRadius || 3000);
    if (!Number.isNaN(lng) && !Number.isNaN(lat) && !Number.isNaN(radius)) {
      filter.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      };
    }
  }

  const list = await (Branch as any)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean({ virtuals: true, getters: true });

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

/* ================= GET BY ID (admin) ================= */
export const adminGetBranchById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const { Branch } = await getTenantModels(req);
  const doc = await (Branch as any).findOne({ _id: id, tenant: req.tenant }).lean();

  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

/* ================= DELETE ================= */
export const deleteBranch = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const { Branch } = await getTenantModels(req);
  const doc = await Branch.findOne({ _id: id, tenant: req.tenant });
  if (!doc) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  await doc.deleteOne();
  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
