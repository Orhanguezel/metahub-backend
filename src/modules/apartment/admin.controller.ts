import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { IApartmentImage } from "@/modules/apartment/types";
import { isValidObjectId } from "@/core/utils/validation";
import slugify from "slugify";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { SUPPORTED_LOCALES, SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

// Boş/Geçersiz referansları temizle
const cleanContactRefs = (raw: any) => {
  const obj = parseIfJson(raw) || {};
  if (!isValidObjectId(obj?.customerRef)) delete obj.customerRef;
  if (!isValidObjectId(obj?.userRef)) delete obj.userRef;

  // boş stringleri temizle
  ["name", "phone", "email", "role"].forEach((k) => {
    if (obj[k] === "") delete obj[k];
  });
  return obj;
};

// CREATE (tek doküman, çoklu resim images[])
export const createApartment = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Apartment } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  try {
    const files: Express.Multer.File[] = (req.files as any) || [];

    const {
      category,
      isPublished,
      publishedAt,
      title,
      content,
      address,
      location,
      customer,
      contact,
      services,
      fees,
      slug: bodySlug,
    } = req.body;

    if (!category || !isValidObjectId(category)) {
      res.status(400).json({ success: false, message: t("categoryRequired") });
      return;
    }
    if (!address) {
      res.status(400).json({ success: false, message: t("addressRequired") });
      return;
    }
    if (!files.length) {
      res.status(400).json({ success: false, message: t("imageRequired") });
      return;
    }

    const baseTitle = fillAllLocales(parseIfJson(title));
    const baseContent = fillAllLocales(parseIfJson(content));
    const addressObj = parseIfJson(address) || {};
    const locationObj = parseIfJson(location);
    const contactObj = cleanContactRefs(contact);
    const servicesArr = Array.isArray(services) ? services : parseIfJson(services);
    const feesArr = Array.isArray(fees) ? fees : parseIfJson(fees);

    // images[]
    const imageDocs: IApartmentImage[] = [];
    for (const file of files) {
      const imageUrl = getImagePath(file);
      if (!imageUrl) continue; // güvenlik: path bulunamazsa atla
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }
      imageDocs.push({
        url: imageUrl,
        thumbnail,
        webp,
        publicId: (file as any).public_id,
      });
    }

    const fallbackName =
      baseTitle?.[locale] || baseTitle?.en || addressObj?.fullText || "apartment";
    const generatedSlug = slugify(
      (bodySlug || fallbackName) + "-" + Date.now().toString(36),
      { lower: true, strict: true }
    );

    const doc = await Apartment.create({
      title: baseTitle,
      content: baseContent,
      tenant: req.tenant,
      slug: bodySlug ? slugify(bodySlug, { lower: true, strict: true }) : generatedSlug,
      images: imageDocs,
      category,
      address: addressObj,
      location: locationObj,
      customer: isValidObjectId(customer) ? customer : undefined,
      contact: contactObj,
      services: Array.isArray(servicesArr) ? servicesArr : [],
      fees: Array.isArray(feesArr) ? feesArr : [],
      isPublished:
        isPublished === undefined ? true : isPublished === "true" || isPublished === true,
      publishedAt: isPublished ? publishedAt || new Date() : undefined,
      isActive: true,
    });

    logger.withReq.info(req, t("created"), {
      ...getRequestContext(req),
      id: doc._id,
      images: imageDocs.length,
    });

    res.status(201).json({ success: true, message: t("created"), data: doc });
  } catch (err: any) {
    logger.withReq.error(req, t("error.create_fail"), {
      ...getRequestContext(req),
      event: "apartment.create",
      module: "apartment",
      status: "fail",
      error: err.message,
    });
    res.status(500).json({ success: false, message: t("error.create_fail") });
  }
});

// UPDATE
export const updateApartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Apartment } = await getTenantModels(req);
  const t = (key: string, params?: any) => translate(key, locale, translations, params);

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const apartment = await Apartment.findOne({ _id: id, tenant: req.tenant });
  if (!apartment) {
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  const payload = req.body;

  if (payload.title) apartment.title = fillAllLocales(parseIfJson(payload.title));
  if (payload.content) apartment.content = fillAllLocales(parseIfJson(payload.content));
  if (payload.category && isValidObjectId(payload.category)) apartment.category = payload.category;
  if (payload.address) apartment.address = parseIfJson(payload.address);
  if (payload.location) apartment.location = parseIfJson(payload.location);
  if (payload.customer && isValidObjectId(payload.customer)) apartment.customer = payload.customer;

  if (payload.contact) {
    const incoming = cleanContactRefs(payload.contact);
    const current: any = (apartment as any).contact || {};
    (apartment as any).contact = { ...current, ...incoming };
  }

  if (payload.services) apartment.services = parseIfJson(payload.services) || [];
  if (payload.fees) apartment.fees = parseIfJson(payload.fees) || [];

  if (payload.isPublished !== undefined)
    apartment.isPublished = payload.isPublished === "true" || payload.isPublished === true;
  if (payload.publishedAt) apartment.publishedAt = payload.publishedAt;
  if (payload.isActive !== undefined)
    apartment.isActive = payload.isActive === "true" || payload.isActive === true;

  // Yeni resimler
  if (Array.isArray(req.files) && req.files.length > 0) {
    for (const file of req.files as Express.Multer.File[]) {
      const imageUrl = getImagePath(file);
      if (!imageUrl) continue;
      let { thumbnail, webp } = getFallbackThumbnail(imageUrl);
      if (shouldProcessImage()) {
        const processed = await processImageLocal(file.path, file.filename, path.dirname(file.path));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }
      apartment.images.push({
        url: imageUrl,
        thumbnail,
        webp,
        publicId: (file as any).public_id,
      });
    }
  }

  // Resim silme
  if (payload.removedImages) {
    try {
      const removed: string[] = Array.isArray(payload.removedImages)
        ? payload.removedImages
        : JSON.parse(payload.removedImages);

      const targetObjs = apartment.images.filter((img: any) => removed.includes(img.url));
      apartment.images = apartment.images.filter((img: any) => !removed.includes(img.url));

      for (const imgObj of targetObjs) {
        const localPath = path.join(
          "uploads",
          req.tenant,
          "apartment-images",
          path.basename(imgObj.url)
        );
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

        if (imgObj.publicId) {
          try {
            await cloudinary.uploader.destroy(imgObj.publicId);
          } catch (e) {
            logger.withReq.error(req, "cloudinary_destroy_error", {
              ...getRequestContext(req),
              publicId: imgObj.publicId,
            });
          }
        }
      }
    } catch {
      // swallow
    }
  }

  await apartment.save();

  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: apartment });
});


// GET ALL (admin)
export const adminGetAllApartment = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Apartment } = await getTenantModels(req);
  const t = (key: string) => translate(key, locale, translations);

  const {
    language,
    category,
    isPublished,
    isActive,
    city,
    zip,
    q,
    nearLng,
    nearLat,
    nearRadius, // metre
  } = req.query;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (typeof language === "string" && SUPPORTED_LOCALES.includes(language as SupportedLocale)) {
    filter[`title.${language}`] = { $exists: true };
  }
  if (typeof category === "string" && isValidObjectId(category)) {
    filter.category = category;
  }
  if (typeof isPublished === "string") {
    filter.isPublished = isPublished === "true";
  }
  filter.isActive = typeof isActive === "string" ? isActive === "true" : true;
  if (typeof city === "string") filter["address.city"] = city;
  if (typeof zip === "string") filter["address.zip"] = zip;

  if (typeof q === "string" && q.trim()) {
    filter.$or = [
      { "address.fullText": { $regex: q.trim(), $options: "i" } },
      { slug: { $regex: q.trim(), $options: "i" } },
    ];
  }

  // Near filtre
  if (nearLng && nearLat) {
    const lng = Number(nearLng);
    const lat = Number(nearLat);
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

  const list = await Apartment.find(filter)
    .populate([
      { path: "category", select: "name slug" },
      { path: "customer", select: "companyName contactName email phone" },
      { path: "services.service", select: "title price durationMinutes slug" },
      { path: "contact.customerRef", select: "companyName contactName email phone" },
      { path: "contact.userRef", select: "name email" },
    ])
    .sort({ createdAt: -1 })
    .lean();

  logger.withReq.info(req, t("listFetched"), {
    ...getRequestContext(req),
    resultCount: list.length,
  });
  res.status(200).json({ success: true, message: t("listFetched"), data: list });
});

// GET BY ID (admin)
export const adminGetApartmentById = asyncHandler(async (req: Request, res: Response) => {
  const locale: SupportedLocale = req.locale || getLogLocale();
  const { Apartment } = await getTenantModels(req);
  const t = (key: string) => translate(key, locale, translations);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const doc = await Apartment.findOne({ _id: id, tenant: req.tenant })
    .populate([
      { path: "category", select: "name slug" },
      { path: "customer", select: "companyName contactName email phone" },
      { path: "services.service", select: "title price durationMinutes slug" },
      { path: "contact.customerRef", select: "companyName contactName email phone" },
      { path: "contact.userRef", select: "name email" },
    ])
    .lean();

  if (!doc || (doc as any).isActive === false) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  res.status(200).json({ success: true, message: t("fetched"), data: doc });
});

// DELETE
export const deleteApartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { Apartment } = await getTenantModels(req);
  const locale: SupportedLocale = req.locale || getLogLocale();
  const t = (key: string) => translate(key, locale, translations);

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") });
    return;
  }

  const apartment = await Apartment.findOne({ _id: id, tenant: req.tenant });
  if (!apartment) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") });
    return;
  }

  // resimleri temizle
  for (const img of apartment.images || []) {
    const localPath = path.join(
      "uploads",
      req.tenant,
      "apartment-images",
      path.basename(img.url)
    );
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if (img.publicId) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        logger.withReq.error(req, "cloudinary_delete_error", {
          ...getRequestContext(req),
          publicId: img.publicId,
        });
      }
    }
  }

  await apartment.deleteOne();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
