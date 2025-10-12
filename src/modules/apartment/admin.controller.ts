import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { IApartmentImage } from "@/modules/apartment/types";
import { isValidObjectId } from "@/core/middleware/auth/validation";
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
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { t as translate } from "@/core/utils/i18n/translate";
import translations from "./i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { Types } from "mongoose";

/* ---------------- utils ---------------- */
const parseIfJson = (value: any) => {
  try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return value; }
};
const isNonEmptyString = (v: any) => typeof v === "string" && v.trim().length > 0;
const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

/* 🔸 lean() dönüşünde $oid çıkmaması için */
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

/* ----- contact (userRef kaldırıldı) ----- */
const cleanContact = (raw: any) => {
  const obj = parseIfJson(raw) || {};
  if (!isValidObjectId(obj?.customerRef)) delete obj.customerRef;
  ["name", "phone", "email", "role"].forEach((k) => {
    if (obj[k] === "") delete obj[k];
  });
  return obj;
};

/* ----- place normalize ----- */
const normalizePlace = (raw: any) => {
  const p = parseIfJson(raw) || {};
  if (!isValidObjectId(p?.neighborhood)) delete p.neighborhood;
  ["cityCode", "districtCode", "zip"].forEach((k) => { if (!isNonEmptyString(p[k])) delete p[k]; });
  return Object.keys(p).length ? p : undefined;
};

/* ----- ops normalize ----- */
const normalizeOps = (raw: any) => {
  const v = parseIfJson(raw) || {};
  const out: any = {};

  if (Array.isArray(v.employees)) {
    out.employees = v.employees.filter((id: any) => isValidObjectId(id));
  }
  if (isValidObjectId(v.supervisor)) out.supervisor = v.supervisor;

  if (Array.isArray(v.services)) {
    out.services = v.services
      .map((s: any) => ({
        service: isValidObjectId(s?.service) ? s.service : undefined,
        schedulePlan: isValidObjectId(s?.schedulePlan) ? s.schedulePlan : undefined,
        operationTemplate: isValidObjectId(s?.operationTemplate) ? s.operationTemplate : undefined,
        priceListItem: isValidObjectId(s?.priceListItem) ? s.priceListItem : undefined,
        isActive: typeof s?.isActive === "boolean" ? s.isActive : undefined,
        notes: isNonEmptyString(s?.notes) ? String(s.notes).trim() : undefined,
      }))
      .filter((s: any) => !!s.service);
  }

  if (isValidObjectId(v.cleaningPlan)) out.cleaningPlan = v.cleaningPlan;
  if (isValidObjectId(v.trashPlan)) out.trashPlan = v.trashPlan;

  if (Number.isInteger(v.cashCollectionDay) && v.cashCollectionDay >= 1 && v.cashCollectionDay <= 31) {
    out.cashCollectionDay = v.cashCollectionDay;
  }

  if (v.notify && typeof v.notify === "object") {
    out.notify = {
      managerOnJobCompleted: !!v.notify.managerOnJobCompleted,
      managerOnJobAssigned: !!v.notify.managerOnJobAssigned,
      employeeOnJobAssigned: !!v.notify.employeeOnJobAssigned,
    };
  }

  return Object.keys(out).length ? out : undefined;
};

/* ----- links normalize ----- */
const normalizeLinks = (raw: any) => {
  const v = parseIfJson(raw) || {};
  const keys = [
    "contracts", "billingPlans", "invoices", "payments", "priceLists",
    "operationJobs", "operationTemplates", "timeEntries",
    "reportDefs", "reportRuns", "files", "contacts"
  ];
  const out: any = {};
  for (const k of keys) {
    if (Array.isArray(v[k])) {
      const filtered = v[k].filter((id: any) => isValidObjectId(id));
      if (filtered.length) out[k] = filtered;
    }
  }
  return Object.keys(out).length ? out : undefined;
};

/* ================= CREATE ================= */
export const createApartment = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Apartment } = await getTenantModels(req);

  try {
    const files: Express.Multer.File[] = (req.files as any) || [];

    const {
      isPublished,
      publishedAt,
      title,
      content,
      address,
      location,
      customer,
      contact,
      slug: bodySlug,
      place,
      snapshots,
      ops,
      links
    } = req.body;

    if (!address) {
      res.status(400).json({ success: false, message: t("addressRequired") }); return;
    }
    if (!files.length) {
      res.status(400).json({ success: false, message: t("imageRequired") }); return;
    }

    const baseTitle = fillAllLocales(parseIfJson(title));
    const baseContent = fillAllLocales(parseIfJson(content));
    const addressObj = parseIfJson(address) || {};
    const locationObj = parseIfJson(location);
    const placeObj = normalizePlace(place);
    const contactObj = cleanContact(contact);
    const snapshotsObj = parseIfJson(snapshots);
    const opsObj = normalizeOps(ops);
    const linksObj = normalizeLinks(links);

    if (!isNonEmptyString(contactObj?.name)) {
      res.status(400).json({ success: false, message: t("contactNameRequired") }); return;
    }

    const imageDocs: IApartmentImage[] = [];
    for (const file of files) {
      const imageUrl = getImagePath(file);
      if (!imageUrl) continue;
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

    const locale: SupportedLocale = (req.locale as SupportedLocale) || getLogLocale();
    const fallbackName = baseTitle?.[locale] || baseTitle?.en || addressObj?.fullText || "apartment";
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
      address: addressObj,
      location: locationObj,
      place: placeObj,
      snapshots: snapshotsObj,
      customer: isValidObjectId(customer) ? customer : undefined,
      contact: contactObj,
      ops: opsObj,
      links: linksObj,
      isPublished:
        isPublished === undefined ? undefined : (isPublished === "true" || isPublished === true),
      publishedAt:
        isPublished === "true" || isPublished === true
          ? (publishedAt || new Date())
          : undefined,
      isActive: true,
    });

    logger.withReq.info(req, t("created"), {
      ...getRequestContext(req),
      id: doc._id,
      images: imageDocs.length,
    });

    res.status(201).json({ success: true, message: t("created"), data: doc.toJSON() });
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

/* ================= UPDATE ================= */
export const updateApartment = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }

  const { Apartment } = await getTenantModels(req);
  const apartment = await Apartment.findOne({ _id: id, tenant: req.tenant });
  if (!apartment) {
    res.status(404).json({ success: false, message: t("notFound") }); return;
  }

  const payload = req.body;

  if (payload.title) apartment.title = fillAllLocales(parseIfJson(payload.title));
  if (payload.content) apartment.content = fillAllLocales(parseIfJson(payload.content));
  if (payload.address) apartment.address = parseIfJson(payload.address);
  if (payload.location) apartment.location = parseIfJson(payload.location);

  if (payload.place) {
    const incoming = normalizePlace(payload.place);
    const current: any = (apartment as any).place || {};
    (apartment as any).place = { ...current, ...(incoming || {}) };
  }

  if (payload.snapshots) {
    const incoming = parseIfJson(payload.snapshots) || {};
    const current: any = (apartment as any).snapshots || {};
    (apartment as any).snapshots = { ...current, ...incoming };
  }

  if (payload.customer && isValidObjectId(payload.customer)) apartment.customer = payload.customer;

  if (payload.contact) {
    const incoming = cleanContact(payload.contact);
    const current: any = (apartment as any).contact || {};
    (apartment as any).contact = { ...current, ...incoming };
  }

  if (payload.ops) {
    const incoming = normalizeOps(payload.ops) || {};
    const cur: any = (apartment as any).ops || {};
    const nextOps: any = { ...cur };

    if ("employees" in incoming) nextOps.employees = incoming.employees;
    if ("supervisor" in incoming) nextOps.supervisor = incoming.supervisor;
    if ("services" in incoming) nextOps.services = incoming.services;
    if ("cleaningPlan" in incoming) nextOps.cleaningPlan = incoming.cleaningPlan;
    if ("trashPlan" in incoming) nextOps.trashPlan = incoming.trashPlan;
    if ("cashCollectionDay" in incoming || incoming.cashCollectionDay === undefined) {
      nextOps.cashCollectionDay = incoming.cashCollectionDay;
    }
    if ("notify" in incoming) {
      nextOps.notify = { ...(cur.notify || {}), ...(incoming.notify || {}) };
    }

    (apartment as any).ops = nextOps;
  }

  if (payload.links) {
    const incoming = normalizeLinks(payload.links) || {};
    const cur: any = (apartment as any).links || {};
    (apartment as any).links = { ...cur, ...incoming };
  }

  if (payload.isPublished !== undefined) {
    apartment.isPublished = payload.isPublished === "true" || payload.isPublished === true;
    if (!apartment.isPublished) apartment.publishedAt = undefined;
  }
  if (payload.publishedAt) apartment.publishedAt = payload.publishedAt as any;
  if (payload.isActive !== undefined)
    apartment.isActive = payload.isActive === "true" || payload.isActive === true;

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
      (apartment as any).images.push({
        url: imageUrl,
        thumbnail,
        webp,
        publicId: (file as any).public_id,
      });
    }
  }

  if (payload.removedImages) {
    try {
      const removed: string[] = Array.isArray(payload.removedImages)
        ? payload.removedImages
        : JSON.parse(payload.removedImages);

      const targetObjs = (apartment as any).images.filter((img: any) => removed.includes(img.url));
      (apartment as any).images = (apartment as any).images.filter(
        (img: any) => !removed.includes(img.url)
      );

      for (const imgObj of targetObjs) {
        const localPath = path.join("uploads", req.tenant, "apartment-images", path.basename(imgObj.url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        if (imgObj.publicId) {
          try { await cloudinary.uploader.destroy(imgObj.publicId); } catch { }
        }
      }
    } catch { }
  }

  await apartment.save();

  logger.withReq.info(req, t("updated"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("updated"), data: apartment.toJSON() });
});

/* ========= ortak: populate konfigürasyonları ========= */
const LITE_SELECT =
  "title content slug address.fullText address.city address.zip isPublished isActive images tenant snapshots place customer ops.cashCollectionDay createdAt updatedAt";

const LITE_POPULATE = [
  { path: "place.neighborhood", select: "name slug" },
  { path: "customer", select: "companyName contactName email phone" },
];

const ADMIN_POPULATE = [
  ...LITE_POPULATE,
  { path: "contact.customerRef", select: "companyName contactName email phone" },
  { path: "ops.employees", select: "fullName email phone role" },
  { path: "ops.supervisor", select: "fullName email phone role" },
  { path: "ops.services.service", select: "code name unit defaultDuration" },
  { path: "ops.services.schedulePlan", select: "name rrule timezone" },
  { path: "ops.services.operationTemplate", select: "name" },
  // 🔸 ÜCRET / PARA BİRİMİ için şart:
  { path: "ops.services.priceListItem", select: "name price currency" },
];

/* ================= LIST (admin) ================= */
export const adminGetAllApartment = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { Apartment } = await getTenantModels(req);

  const {
    language,
    neighborhood,
    cityCode,
    districtCode,
    zip,
    isPublished,
    isActive,
    city,
    q,
    nearLng,
    nearLat,
    nearRadius,
    employee,
    supervisor,
    service,
    cashDay,
    customer,
    view = "lite"               // 🔸 lite | admin
  } = req.query as Record<string, string>;

  const filter: Record<string, any> = { tenant: req.tenant };

  if (language && SUPPORTED_LOCALES.includes(language as SupportedLocale)) {
    filter[`title.${language}`] = { $exists: true };
  }
  if (neighborhood && isValidObjectId(neighborhood)) filter["place.neighborhood"] = neighborhood;
  if (cityCode) filter["place.cityCode"] = cityCode;
  if (districtCode) filter["place.districtCode"] = districtCode;
  if (zip) {
    filter.$or = [
      ...(Array.isArray(filter.$or) ? filter.$or : []),
      { "place.zip": zip },
      { "address.zip": zip },
    ];
  }
  if (isPublished != null) filter.isPublished = isPublished === "true";
  filter.isActive = isActive != null ? isActive === "true" : true;
  if (city) filter["address.city"] = city;

  if (q && q.trim()) {
    const qx = q.trim();
    const nameOrs = SUPPORTED_LOCALES.map((lng) => ({
      [`snapshots.neighborhoodName.${lng}`]: { $regex: qx, $options: "i" },
    }));
    filter.$or = [
      ...(Array.isArray(filter.$or) ? filter.$or : []),
      { "address.fullText": { $regex: qx, $options: "i" } },
      { slug: { $regex: qx, $options: "i" } },
      ...nameOrs,
    ];
  }

  if (nearLng && nearLat) {
    const lng = Number(nearLng), lat = Number(nearLat);
    const radius = Number(nearRadius || 3000);
    if (!Number.isNaN(lng) && !Number.isNaN(lat) && !Number.isNaN(radius)) {
      filter.location = {
        $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: radius }
      };
    }
  }

  if (employee && isValidObjectId(employee)) filter["ops.employees"] = employee;
  if (supervisor && isValidObjectId(supervisor)) filter["ops.supervisor"] = supervisor;
  if (service && isValidObjectId(service)) filter["ops.services.service"] = service;
  if (cashDay && /^\d+$/.test(cashDay)) {
    const d = Number(cashDay); if (d >= 1 && d <= 31) filter["ops.cashCollectionDay"] = d;
  }
  if (customer && isValidObjectId(customer)) filter["customer"] = customer;

  const useAdmin = String(view) === "admin";
  const list = await Apartment.find(filter)
    .select(useAdmin ? undefined : LITE_SELECT)
    .populate(useAdmin ? ADMIN_POPULATE : LITE_POPULATE)
    .sort({ createdAt: -1 })
    .lean({ virtuals: true, getters: true });

  logger.withReq.info(req, t("listFetched"), { ...getRequestContext(req), resultCount: list.length });
  res.status(200).json({ success: true, message: t("listFetched"), data: stringifyIdsDeep(list) });
});

/* ================= GET BY ID (admin) ================= */
export const adminGetApartmentById = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;
  const { withFinance = "0" } = req.query as Record<string, string>;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }

  const { Apartment } = await getTenantModels(req);
  const doc = await Apartment.findOne({ _id: id, tenant: req.tenant })
    .populate(ADMIN_POPULATE)
    .lean({ virtuals: true, getters: true });

  if (!doc || (doc as any).isActive === false) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") }); return;
  }

  const data: any = stringifyIdsDeep(doc);

  // (opsiyonel) finans özeti — burada kendi billing/cashbook entegrasyonunuzla doldurun
  if (withFinance === "1" || withFinance === "true") {
    // TODO: billing servisinden hesapla
    data.finance = {
      lastPaymentAt: null,
      nextDueAt: null,
      outstandingAmount: null,
      currency: data?.ops?.services?.[0]?.priceListItem?.currency || null
    };
  }

  res.status(200).json({ success: true, message: t("fetched"), data });
});

/* ================= DELETE ================= */
export const deleteApartment = asyncHandler(async (req: Request, res: Response) => {
  const t = tByReq(req);
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.withReq.warn(req, t("invalidId"), { ...getRequestContext(req), id });
    res.status(400).json({ success: false, message: t("invalidId") }); return;
  }

  const { Apartment } = await getTenantModels(req);
  const apartment = await Apartment.findOne({ _id: id, tenant: req.tenant });
  if (!apartment) {
    logger.withReq.warn(req, t("notFound"), { ...getRequestContext(req), id });
    res.status(404).json({ success: false, message: t("notFound") }); return;
  }

  for (const img of (apartment as any).images || []) {
    const localPath = path.join("uploads", req.tenant, "apartment-images", path.basename(img.url));
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    if ((img as any).publicId) {
      try { await cloudinary.uploader.destroy((img as any).publicId); } catch { }
    }
  }

  await apartment.deleteOne();

  logger.withReq.info(req, t("deleted"), { ...getRequestContext(req), id });
  res.status(200).json({ success: true, message: t("deleted") });
});
