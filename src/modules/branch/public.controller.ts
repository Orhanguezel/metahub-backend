import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { t as translate } from "@/core/utils/i18n/translate";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import translations from "./i18n";

/* helpers */
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* Public: aktif şubeler listesi */
export const publicGetBranches = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Branch } = await getTenantModels(req);

  const {
    q,
    service,         // delivery|pickup|dinein
    nearLng,
    nearLat,
    nearRadius,
    limit = "200",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant, isActive: true };

  if (service && ["delivery", "pickup", "dinein"].includes(service)) {
    filter.services = service;
  }

  if (q && q.trim()) {
    const qx = q.trim();
    filter.$or = [
      { code: { $regex: qx, $options: "i" } },
      ...SUPPORTED_LOCALES.map((lng) => ({ [`name.${lng}`]: { $regex: qx, $options: "i" } })),
      { "address.fullText": { $regex: qx, $options: "i" } },
    ];
  }

  if (nearLng && nearLat) {
    const lng = Number(nearLng), lat = Number(nearLat);
    const radius = Number(nearRadius || 4000);
    if (!Number.isNaN(lng) && !Number.isNaN(lat) && !Number.isNaN(radius)) {
      filter.location = {
        $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: radius },
      };
    }
  }

  const list = await (Branch as any)
    .find(filter)
    .select("code name address.fullText location services minPrepMinutes")
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 200, 500))
    .lean();

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), public: true, resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

/* Public: tek şube → basit availability (açık/kapalı) */
export const publicGetBranchAvailability = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Branch } = await getTenantModels(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }

  const doc = await (Branch as any).findOne({ _id: id, tenant: req.tenant, isActive: true }).lean();
  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") }); return;
  }

  // Basit açık/kapalı kontrolü (server saatine göre)
  const now = new Date();
  const dow = now.getDay(); // 0-6
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // o günün slotları
  const todays = (doc.openingHours || []).filter((x: any) => x.day === dow);
  const isOpen = todays.some((x: any) => x.open <= hm && hm < x.close);

  res.status(200).json({
    success: true,
    message: t("fetched"),
    data: {
      branchId: String(doc._id),
      isOpen,
      now: now.toISOString(),
      todaysWindows: todays,
      timezone: "Europe/Istanbul",
    },
  });
});
