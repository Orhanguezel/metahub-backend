import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SupportedLocale, SUPPORTED_LOCALES } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

export const publicGetAllApartment = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Apartment } = await getTenantModels(req);
  const t = (key: string) => translate(key, locale, translations);

  const {
    language,
    category,
    city,
    zip,
    q,
    nearLng,
    nearLat,
    nearRadius, // metre
    limit = "200",
  } = req.query;

  const filter: Record<string, any> = {
    tenant: req.tenant,
    isActive: true,
    isPublished: true,
  };

  if (typeof language === "string" && SUPPORTED_LOCALES.includes(language as SupportedLocale)) {
    filter[`title.${language}`] = { $exists: true };
  }
  if (typeof category === "string" && isValidObjectId(category)) filter.category = category;
  if (typeof city === "string") filter["address.city"] = city;
  if (typeof zip === "string") filter["address.zip"] = zip;

  if (typeof q === "string" && q.trim()) {
    filter.$or = [
      { "address.fullText": { $regex: q.trim(), $options: "i" } },
      { slug: { $regex: q.trim(), $options: "i" } },
    ];
  }

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

  const list = await Apartment.find(filter)
    .select("title slug images address location category")
    .populate([{ path: "category", select: "name slug" }])
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
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Apartment } = await getTenantModels(req);
  const t = (key: string) => translate(key, locale, translations);
  const { slug } = req.params;

  const doc = await Apartment.findOne({
    tenant: req.tenant,
    slug: slug.toLowerCase(),
    isActive: true,
    isPublished: true,
  })
    .populate([
      { path: "category", select: "name slug" },
      { path: "customer", select: "companyName contactName email phone" },
      { path: "services.service", select: "title price durationMinutes slug" },
      { path: "contact.customerRef", select: "companyName contactName email phone" },
      { path: "contact.userRef", select: "name email" },
    ])
    .lean();

  if (!doc) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});
