import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

/* helpers */
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

export const publicGetAllApartment = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Apartment } = await getTenantModels(req);

  const {
    language,
    neighborhood,       // ObjectId (v2)
    cityCode,           // v2 normalize
    districtCode,       // v2 normalize
    city,
    zip,
    q,
    nearLng,
    nearLat,
    nearRadius,         // metre
    service,            // ops.services.service (opsiyonel, public filtre)
    limit = "200",
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  };

  if (language && SUPPORTED_LOCALES.includes(language as SupportedLocale)) {
    filter[`title.${language}`] = { $exists: true };
  }
  if (neighborhood && isValidObjectId(neighborhood)) filter["place.neighborhood"] = neighborhood;
  if (cityCode) filter["place.cityCode"] = cityCode;
  if (districtCode) filter["place.districtCode"] = districtCode;
  if (city) filter["address.city"] = city;

  const orParts: any[] = [];
  if (zip) orParts.push({ "place.zip": zip }, { "address.zip": zip });

  if (q && q.trim()) {
    const qx = q.trim();
    orParts.push(
      { slug: { $regex: qx, $options: "i" } },
      { "address.fullText": { $regex: qx, $options: "i" } },
      ...SUPPORTED_LOCALES.map((lng) => ({ [`title.${lng}`]: { $regex: qx, $options: "i" } })),
      ...SUPPORTED_LOCALES.map((lng) => ({ [`snapshots.neighborhoodName.${lng}`]: { $regex: qx, $options: "i" } }))
    );
  }
  if (orParts.length) filter.$or = orParts;

  // near (geo)
  if (nearLng && nearLat) {
    const lng = Number(nearLng);
    const lat = Number(nearLat);
    const radius = Number(nearRadius || 4000);
    if (!Number.isNaN(lng) && !Number.isNaN(lat) && !Number.isNaN(radius)) {
      filter.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      };
    }
  }

  // ops/services public filtresi (gizli alan döndürmüyoruz, sadece filtreleme)
  if (service && isValidObjectId(service)) {
    filter["ops.services.service"] = service;
  }

  const list = await Apartment.find(filter)
    .select("title slug images address location place snapshots.neighborhoodName") // güvenli seçim
    .populate([{ path: "place.neighborhood", select: "name slug" }])
    .limit(Math.min(Number(limit) || 200, 500))
    .sort({ createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
    public: true,
  });

  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

export const publicGetApartmentBySlug = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Apartment } = await getTenantModels(req);
  const { slug } = req.params;

  const doc = await Apartment.findOne({
    tenant: req.tenant,
    slug: String(slug || "").toLowerCase(),
    isActive: true,
    isPublished: true,
  })
    // public detay: içerik ve i18n başlıklar verilebilir; müşteri/iletişim/ops/link verilmez
    .select("title content images address location place snapshots slug createdAt updatedAt")
    .populate([{ path: "place.neighborhood", select: "name slug" }])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
