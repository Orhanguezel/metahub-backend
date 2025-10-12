// src/modules/sellers/controller.ts
import type { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import type { SupportedLocale } from "@/types/common";
import translations from "./i18n";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import {
  getImagePath,
  getFallbackThumbnail,
  processImageLocal,
  shouldProcessImage,
} from "@/core/middleware/file/uploadUtils";
import { Types } from "mongoose";

const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations, p);

const normEmail = (s?: string) => (s || "").trim().toLowerCase();
const normPhone = (s?: string) => {
  if (!s) return s;
  let v = s.trim().replace(/[\s()-]/g, "");
  if (v.startsWith("00")) v = "+" + v.slice(2);
  v = v.replace(/(?!^\+)\+/g, "");
  v = v.replace(/[^\d+]/g, "");
  return v;
};

const parseIfJson = (value: any) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};
const toIdArray = (v: any): string[] => {
  const raw = parseIfJson(v);
  if (Array.isArray(raw)) return raw.map(String).filter(x => /^[0-9a-fA-F]{24}$/.test(x));
  if (typeof raw === "string") {
    if (/^\[/.test(raw)) return (parseIfJson(raw) || []).filter((x: any) => /^[0-9a-fA-F]{24}$/.test(String(x)));
    return raw.split(",").map(s => s.trim()).filter(x => /^[0-9a-fA-F]{24}$/.test(x));
  }
  return [];
};

/** userRef varsa user'dan temel alanları çekmeye çalış */
const fillFromUser = async (req: Request, models: any, userRef?: string | null) => {
  if (!userRef) return null;
  const { User } = models;
  if (!User) return null;
  const u =
    (await User.findOne({ _id: userRef, tenant: req.tenant })) ||
    (await User.findById(userRef));
  if (!u) return null;

  const name =
    u.fullName?.trim?.() ||
    [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
    u.name?.trim?.() ||
    u.username?.trim?.() ||
    u.email?.split?.("@")?.[0] ||
    "";

  return {
    contactName: name || undefined,
    email: u.email || undefined,
    phone: (u.phone?.e164 || u.phone || undefined) as string | undefined,
  };
};

// ---- Görseller yardımcıları ----
function normalizeRemoveImages(val: any): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) return val.map(String);
  return [String(val)];
}

async function appendUploadedImages(targetArr: any[], files: Express.Multer.File[]) {
  for (const f of files) {
    const url = getImagePath(f);
    let { thumbnail, webp } = getFallbackThumbnail(url);
    if (shouldProcessImage()) {
      const processed = await processImageLocal(f.path, f.filename, path.dirname(f.path));
      thumbnail = processed.thumbnail; webp = processed.webp;
    }
    targetArr.push({ url, thumbnail, webp, publicId: (f as any).public_id });
  }
}

async function tryDestroyCloudinary(publicId?: string) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    /* best-effort */
  }
}

function ensurePrimaryFromIndex(images: any[], idx?: number) {
  if (!Array.isArray(images) || !images.length) return images;
  if (typeof idx !== "number") return images;
  if (idx < 0 || idx >= images.length) return images;
  const [spliced] = images.splice(idx, 1);
  images.unshift(spliced);
  return images;
}

function toArray<T>(v: any): T[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

// flexible → strict Address mapping
function normalizeAddressInput(raw: any) {
  const a = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : raw || {};

  const addressLine =
    a.addressLine ?? a.line1 ?? a.line ?? a.street ?? a.address ?? "";

  const addressLine2 =
    a.addressLine2 ?? a.line2 ?? a.street2 ?? a.address2 ?? "";

  const addressType = (a.addressType ?? a.type ?? a.kind ?? "other").toString();

  if (!addressLine) throw new Error("addressLine_required");

  const safeType = ["billing", "shipping", "other"].includes(addressType)
    ? addressType
    : "other";

  return {
    fullName: a.fullName ?? a.name,
    phone: a.phone,
    addressLine,
    addressLine2,
    city: a.city,
    state: a.state,
    country: a.country,
    postalCode: a.postalCode ?? a.zip ?? a.postcode,
    addressType: safeType,
  };
}

/* -------- ADMIN: LIST -------- */
export const getAllSellers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const t = tByReq(req);
  try {
    const { Seller } = await getTenantModels(req);
    const { q, kind, isActive } = req.query as Record<string, string>;
    const filter: any = { tenant: req.tenant };

    if (kind && ["person", "organization"].includes(kind)) filter.kind = kind;
    if (typeof isActive === "string") filter.isActive = isActive === "true";

    if (q?.trim()) {
      const r = new RegExp(q.trim(), "i");
      filter.$or = [
        { companyName: r },
        { contactName: r },
        { categories: r },
        { email: r },
        { phone: r },
        { slug: r },
        { tags: r },
      ];
    }

    const sellers = await Seller.find(filter).populate("addresses").sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: t("seller.success.fetched"), data: sellers });
    return;
  } catch (error) { next(error); }
});

/* ------- PUBLIC: LIST -------- */
export const listSellersPublic = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const t = tByReq(req);
  try {
    const { Seller } = await getTenantModels(req);
    const { q, kind, isActive } = req.query as Record<string, string>;
    const filter: any = { tenant: req.tenant };

    if (kind && ["person", "organization"].includes(kind)) filter.kind = kind;
    if (typeof isActive === "string") filter.isActive = isActive === "true";

    if (q?.trim()) {
      const r = new RegExp(q.trim(), "i");
      filter.$or = [
        { companyName: r },
        { contactName: r },
        { categories: r },
        { email: r },
        { phone: r },
        { slug: r },
        { tags: r },
      ];
    }

    const sellers = await (Seller as any).find(filter).populate("addresses").sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: t("seller.success.fetched"), data: sellers });
    return;
  } catch (error) { next(error); }
});

/* -------- ADMIN: GET BY ID -------- */
export const getSellerById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const t = tByReq(req);
  try {
    const { Seller } = await getTenantModels(req);
    const seller = await (Seller as any).findOne({ _id: req.params.id, tenant: req.tenant }).populate("addresses");

    if (!seller) {
      res.status(404).json({ success: false, message: t("seller.errors.notFound") });
      logger.withReq.warn(req, t("seller.errors.notFound"), {
        ...getRequestContext(req),
        module: "seller",
        event: "seller.getById",
        status: "fail",
        sellerId: req.params.id,
      });
      return;
    }

    res.status(200).json({ success: true, message: t("seller.success.fetched"), data: seller });
    return;
  } catch (error) { next(error); }
});

/* ----------------- CREATE (ADMIN) ----------------- */
export const createSeller = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const t = tByReq(req);
  try {
    const models = await getTenantModels(req);
    const { Seller, Address } = models;

    const {
      kind,
      companyName,
      contactName,
      email,
      phone,
      addresses,
      billing,
      tags,
      notes,
      slug,
      isActive,
      userRef,
      categories,
    } = req.body;

    // userRef => eksik alanları doldur
    const snap = await fillFromUser(req, models, userRef);
    const finalContact = (contactName || snap?.contactName || "").trim();
    const finalEmail = normEmail(email || snap?.email);
    const finalPhone = normPhone(phone || snap?.phone);

    if (!finalContact || !finalEmail || !finalPhone) {
      res.status(400).json({ success: false, message: t("seller.errors.requiredFields") });
      return;
    }

    // kategoriler (admin create için zorunlu)
    const categoryIds = toIdArray(categories);
    if (!categoryIds.length) {
      res.status(400).json({ success: false, message: "categories_required" });
      return;
    }

    // benzersizlik
    if (await Seller.findOne({ tenant: req.tenant, email: finalEmail })) {
      res.status(409).json({ success: false, message: t("seller.errors.emailExists") });
      return;
    }
    if (await Seller.findOne({ tenant: req.tenant, phone: finalPhone })) {
      res.status(409).json({ success: false, message: t("seller.errors.phoneExists") });
      return;
    }
    if (userRef && await Seller.findOne({ tenant: req.tenant, userRef })) {
      res.status(409).json({ success: false, message: t("seller.errors.userLinked") });
      return;
    }

    // --- Adresler (esnek alan adlarıyla) ---
    const addressIds: any[] = [];
    for (const addrRaw of toArray<any>(addresses)) {
      try {
        const norm = normalizeAddressInput(addrRaw);
        const created = await Address.create({ ...norm, tenant: req.tenant, sellerId: null });
        addressIds.push(created._id);
      } catch (e: any) {
        res.status(400).json({
          success: false,
          message: "address_validation_failed",
          detail: e?.message || "address_invalid",
        });
        return;
      }
    }

    // --- Görseller (multipart: images[]) ---
    const images: any[] = [];
    if (Array.isArray((req as any).files) && (req as any).files.length) {
      await appendUploadedImages(images, (req as any).files as Express.Multer.File[]);
    }

    const seller = await Seller.create({
      tenant: req.tenant,
      kind: kind || "person",
      companyName,
      contactName: finalContact,
      images,
      email: finalEmail,
      phone: finalPhone,
      userRef: userRef || null,
      addresses: addressIds,
      billing: billing || undefined,
      tags: Array.isArray(tags) ? tags : undefined,
      notes,
      avatarUrl: images[0]?.url,
      coverUrl: images[1]?.url,
      location: undefined,
      rating: 0,
      slug,
      isActive: isActive === "false" ? false : isActive === false ? false : true,
      categories: categoryIds,
    });

    if (addressIds.length) {
      await Address.updateMany({ _id: { $in: addressIds } }, { $set: { sellerId: seller._id } });
    }

    const created = await Seller.findById(seller._id).populate("addresses");
    res.status(201).json({ success: true, message: t("seller.success.created"), data: created });
    return;
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ success: false, message: "duplicate_key", key: error?.keyValue });
      return;
    }
    if (error?.name === "ValidationError") {
      res.status(400).json({ success: false, message: "validation_error", errors: error?.errors });
      return;
    }
    next(error);
  }
});

/* ----------------- UPDATE (ADMIN) ----------------- */
export const updateSeller = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const t = tByReq(req);
  try {
    const models = await getTenantModels(req);
    const { Seller, Address } = models;

    const seller = await Seller.findOne({ _id: req.params.id, tenant: req.tenant });
    if (!seller) {
      res.status(404).json({ success: false, message: t("seller.errors.notFound") });
      return;
    }

    const {
      kind,
      companyName,
      contactName,
      email,
      phone,
      addresses,
      billing,
      tags,
      notes,
      slug,
      isActive,
      userRef,
      removeImages,
      primaryIndex,
      replaceAt,
      categories,
    } = req.body || {};

    // --- Adresler (tam set; 0 uzunluk da kabul) ---
    if (Array.isArray(addresses)) {
      const nextIds: any[] = [];
      for (const addrRaw of addresses) {
        const norm = normalizeAddressInput(addrRaw);
        if (addrRaw?._id) {
          const updated = await Address.findByIdAndUpdate(
            addrRaw._id,
            { ...norm },
            { new: true, runValidators: true }
          );
          if (updated) nextIds.push(updated._id);
        } else {
          const created = await Address.create({ ...norm, tenant: req.tenant, sellerId: seller._id });
          nextIds.push(created._id);
        }
      }
      (seller as any).addresses = nextIds;
    }

    // --- userRef değişimi ---
    if (typeof userRef !== "undefined") {
      if (userRef) {
        const dupUser = await Seller.findOne({ tenant: req.tenant, userRef, _id: { $ne: seller._id } });
        if (dupUser) {
          res.status(409).json({ success: false, message: t("seller.errors.userLinked") });
          return;
        }

        const snap = await fillFromUser(req, models, userRef);
        if (snap?.contactName && typeof contactName === "undefined" && !seller.contactName) seller.contactName = snap.contactName;
        if (snap?.email && typeof email === "undefined" && !seller.email) seller.email = normEmail(snap.email);
        if (snap?.phone && typeof phone === "undefined" && !seller.phone) seller.phone = normPhone(snap.phone);
        (seller as any).userRef = userRef;
      } else {
        (seller as any).userRef = null;
      }
    }

    // --- benzersizlik (email/phone değişirse) ---
    if (typeof email !== "undefined") {
      const emailNorm = normEmail(email);
      if (emailNorm !== seller.email) {
        const exists = await Seller.findOne({ tenant: req.tenant, email: emailNorm, _id: { $ne: seller._id } });
        if (exists) {
          res.status(409).json({ success: false, message: t("seller.errors.emailExists") });
          return;
        }
        seller.email = emailNorm;
      }
    }
    if (typeof phone !== "undefined") {
      const phoneNorm = normPhone(phone);
      if (phoneNorm !== seller.phone) {
        const exists = await Seller.findOne({ tenant: req.tenant, phone: phoneNorm, _id: { $ne: seller._id } });
        if (exists) {
          res.status(409).json({ success: false, message: t("seller.errors.phoneExists") });
          return;
        }
        seller.phone = phoneNorm!;
      }
    }

    if (typeof kind !== "undefined") seller.kind = kind;
    if (typeof companyName !== "undefined") seller.companyName = companyName;
    if (typeof contactName !== "undefined") seller.contactName = contactName;
    if (typeof notes !== "undefined") seller.notes = notes;
    if (typeof slug !== "undefined") (seller as any).slug = slug;
    if (typeof isActive !== "undefined") seller.isActive = isActive === "true" || isActive === true;
    if (typeof billing !== "undefined") (seller as any).billing = billing || undefined;
    if (typeof tags !== "undefined") (seller as any).tags = Array.isArray(tags) ? tags : undefined;

    // --- Kategoriler (opsiyonel güncelleme; boş gönderilemez)
    if (typeof categories !== "undefined") {
      const ids = toIdArray(categories);
      if (!ids.length) {
        res.status(400).json({ success: false, message: "categories_required" });
        return;
      }
      (seller as any).categories = ids;
    }

    // --- Görseller: silme ---
    (seller as any).images = (seller as any).images || [];
    if (typeof removeImages !== "undefined") {
      const toRemove = normalizeRemoveImages(removeImages);
      if (toRemove.length && Array.isArray((seller as any).images)) {
        (seller as any).images = (seller as any).images.filter((img: any) => {
          const hit = toRemove.includes(String(img.publicId || "")) || toRemove.includes(String(img.url || ""));
          if (hit) tryDestroyCloudinary(img.publicId);
          return !hit;
        });
      }
    }

    // --- Görseller: replaceAt (tek dosya) ya da ekleme ---
    if (typeof replaceAt === "number" && Array.isArray((req as any).files) && (req as any).files.length > 0) {
      const idx = Math.max(0, Math.min(replaceAt, ((seller as any).images?.length || 1) - 1));
      const tempArr: any[] = [];
      await appendUploadedImages(tempArr, [(req as any).files[0]]);
      const newImage = tempArr[0];
      if ((seller as any).images?.[idx]?.publicId) await tryDestroyCloudinary((seller as any).images[idx].publicId);
      (seller as any).images[idx] = newImage;
    } else if (Array.isArray((req as any).files) && (req as any).files.length > 0) {
      await appendUploadedImages((seller as any).images, (req as any).files as Express.Multer.File[]);
    }

    // --- Primary → avatar/cover ---
    ensurePrimaryFromIndex((seller as any).images, typeof primaryIndex === "number" ? primaryIndex : undefined);
    (seller as any).avatarUrl = (seller as any).images?.[0]?.url;
    (seller as any).coverUrl  = (seller as any).images?.[1]?.url;

    await seller.save();
    const updated = await Seller.findById(seller._id).populate("addresses");
    res.status(200).json({ success: true, message: t("seller.success.updated"), data: updated });
    return;
  } catch (error: any) {
    if (error?.name === "ValidationError") {
      res.status(400).json({ success: false, message: "validation_error", errors: error?.errors });
      return;
    }
    next(error);
  }
});

/* -------- ADMIN: DELETE -------- */
export const deleteSeller = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const t = tByReq(req);
  try {
    const { Seller, Address } = await getTenantModels(req);
    const deleted = await (Seller as any).findOneAndDelete({ _id: req.params.id, tenant: req.tenant });

    if (!deleted) {
      res.status(404).json({ success: false, message: t("seller.errors.notFound") });
      return;
    }

    // görseller best-effort temizliği
    if (Array.isArray((deleted as any).images)) {
      for (const img of (deleted as any).images) await tryDestroyCloudinary(img?.publicId);
    }

    // orphan address temizliği (opsiyonel)
    await (Address as any).deleteMany({ sellerId: req.params.id });

    res.status(200).json({ success: true, message: t("seller.success.deleted"), id: req.params.id });
    return;
  } catch (error) { next(error); }
});

/* -------- PUBLIC: GET by id -------- */
export const getSellerPublicById = asyncHandler(async (req, res, next) => {
  const t = tByReq(req);
  try {
    const { Seller } = await getTenantModels(req);
    const seller = await (Seller as any)
      .findOne({ _id: req.params.id, tenant: (req as any).tenant })
      .populate("addresses");

    if (!seller) {
      res.status(404).json({ success: false, message: t("seller.errors.notFound") });
      return;
    }
    res.status(200).json({ success: true, message: t("seller.success.fetched"), data: seller });
  } catch (error) { next(error); }
});

/* -------- PUBLIC: UPDATE (self) -------- */
export const updateSellerPublic = asyncHandler(async (req, res, next) => {
  const t = tByReq(req);
  const { Seller } = await getTenantModels(req);

  const authUserId =
    (req as any).user?.id?.toString?.() ||
    (req as any).user?._id?.toString?.();

  if (!authUserId) { res.status(401).json({ success: false, message: t("seller.errors.unauthorized") }); return; }

  // Sıkı sahiplik: hem _id eşleşecek hem userRef = auth user
  const seller = await (Seller as any).findOne({
    tenant: (req as any).tenant,
    _id: req.params.id,
    userRef: authUserId,
  });

  if (!seller) { res.status(404).json({ success: false, message: t("seller.errors.notFound") }); return; }

  // --- normalize & benzersizlik
  const upd: any = {};
  if (req.body.companyName !== undefined) upd.companyName = req.body.companyName;
  if (req.body.contactName !== undefined) upd.contactName = req.body.contactName;
  if (req.body.kind !== undefined)        upd.kind = req.body.kind;
  if (req.body.notes !== undefined)       upd.notes = req.body.notes;

  if (req.body.email !== undefined) {
    const emailNorm = normEmail(req.body.email);
    if (emailNorm !== seller.email) {
      const exists = await Seller.findOne({ tenant: (req as any).tenant, email: emailNorm, _id: { $ne: seller._id } });
      if (exists) { res.status(409).json({ success: false, message: "seller.errors.emailExists" }); return; }
      upd.email = emailNorm;
    }
  }
  if (req.body.phone !== undefined) {
    const phoneNorm = normPhone(req.body.phone);
    if (phoneNorm !== seller.phone) {
      const exists = await Seller.findOne({ tenant: (req as any).tenant, phone: phoneNorm, _id: { $ne: seller._id } });
      if (exists) { res.status(409).json({ success: false, message: "seller.errors.phoneExists" }); return; }
      upd.phone = phoneNorm;
    }
  }

  // location
  if (req.body.location !== undefined) {
    const loc = parseIfJson(req.body.location);
    upd.location = {
      country: (loc?.country || undefined)?.toString?.().trim?.(),
      city: (loc?.city || undefined)?.toString?.().trim?.(),
    };
    if (!upd.location.country && !upd.location.city) upd.location = undefined;
  }

  // billing
  if (req.body.billing !== undefined) {
    const b = parseIfJson(req.body.billing);
    upd.billing = b ? {
      taxNumber: b.taxNumber || undefined,
      iban: b.iban || undefined,
      defaultCurrency: b.defaultCurrency || undefined,
      paymentTermDays: b.paymentTermDays !== undefined ? Number(b.paymentTermDays) : undefined,
      defaultDueDayOfMonth: b.defaultDueDayOfMonth !== undefined ? Number(b.defaultDueDayOfMonth) : undefined,
    } : undefined;
  }

  // tags
  if (req.body.tags !== undefined) {
    const raw = parseIfJson(req.body.tags);
    upd.tags = Array.isArray(raw)
      ? Array.from(new Set(raw.filter(Boolean).map((t: any) => String(t).trim().toLowerCase())))
      : undefined;
  }

  // categories (opsiyonel güncelleme; boş gönderilemez)
  if (req.body.categories !== undefined) {
    const ids = toIdArray(req.body.categories);
    if (!ids.length) { res.status(400).json({ success: false, message: "categories_required" }); return; }
    upd.categories = ids;
  }

  Object.assign(seller, upd);
  await seller.save();

  const populated = await Seller.findById(seller._id).populate("addresses");
  res.status(200).json({ success: true, message: t("seller.success.updated"), data: populated });
});

// controller içine ek helper (me'yi döndür)
export const getMySeller = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { Seller } = await getTenantModels(req);

  const u = (req as any).user;
  const uidStr: string | undefined =
    u?.id?.toString?.() ||
    u?._id?.toString?.() ||
    u?.userId?.toString?.();

  if (!uidStr) {
    res.status(401).json({ success: false, message: "seller.errors.unauthorized" });
    return;
  }

  const uid = Types.ObjectId.isValid(uidStr) ? new Types.ObjectId(uidStr) : (uidStr as any);

  const seller = await (Seller as any)
    .findOne({ tenant: (req as any).tenant, userRef: uid })
    .populate("addresses")
    .lean();

  if (!seller) {
    res.status(404).json({ success: false, message: "seller.errors.notFound" });
    return;
  }

  res.status(200).json({ success: true, message: "seller.success.fetched", data: seller });
});

export const uploadMySellerLogo = asyncHandler(async (req, res) => {
  const { Seller } = await getTenantModels(req);
  const uid =
    (req as any).user?.id?.toString?.() ||
    (req as any).user?._id?.toString?.();

  if (!uid) {
    res.status(401).json({ success: false, message: "seller.errors.unauthorized" });
    return;
  }

  const seller = await Seller.findOne({ tenant: (req as any).tenant, userRef: uid });
  if (!seller) {
    res.status(404).json({ success: false, message: "seller.errors.notFound" });
    return;
  }

  if (!(req as any).file) {
    res.status(400).json({ success: false, message: "file_required" });
    return;
  }

  const images: any[] = [];
  await appendUploadedImages(images, [(req as any).file]);
  const newLogo = images[0];

  (seller as any).images = Array.isArray((seller as any).images) ? (seller as any).images : [];
  if ((seller as any).images[0]?.publicId) {
    await tryDestroyCloudinary((seller as any).images[0].publicId);
    }

  (seller as any).images[0] = newLogo;
  (seller as any).avatarUrl = newLogo.url;
  (seller as any).coverUrl  = (seller as any).images?.[1]?.url;

  await seller.save();
  res.status(200).json({ success: true, message: "seller.success.updated", data: seller });
});

export const uploadMySellerCover = asyncHandler(async (req, res) => {
  const { Seller } = await getTenantModels(req);
  const uid =
    (req as any).user?.id?.toString?.() ||
    (req as any).user?._id?.toString?.();

  if (!uid) {
    res.status(401).json({ success: false, message: "seller.errors.unauthorized" });
    return;
  }

  const seller = await Seller.findOne({ tenant: (req as any).tenant, userRef: uid });
  if (!seller) {
    res.status(404).json({ success: false, message: "seller.errors.notFound" });
    return;
  }

  const file = (req as any).file;
  if (!file) {
    res.status(400).json({ success: false, message: "file_required" });
    return;
  }

  const images: any[] = [];
  await appendUploadedImages(images, [file]);
  const newCover = images[0];

  (seller as any).images = Array.isArray((seller as any).images) ? (seller as any).images : [];

  const idx = 1; // cover ikinci görsel
  const prev = (seller as any).images[idx];
  if (prev?.publicId) await tryDestroyCloudinary(prev.publicId);

  if ((seller as any).images.length <= idx) {
    while ((seller as any).images.length < idx) (seller as any).images.push(undefined as any);
    (seller as any).images.push(newCover);
  } else {
    (seller as any).images[idx] = newCover;
  }

  (seller as any).avatarUrl = (seller as any).images?.[0]?.url || (seller as any).avatarUrl;
  (seller as any).coverUrl  = newCover.url;

  await seller.save();

  res.status(200).json({ success: true, message: "seller.success.updated", data: seller });
});

// PUBLIC: Kendi adresimi upsert et (primary = addresses[0])
export const upsertMySellerAddress = asyncHandler(async (req, res) => {
  const { Seller, Address } = await getTenantModels(req);

  const uid =
    (req as any).user?.id?.toString?.() ||
    (req as any).user?._id?.toString?.();
  if (!uid) {
    res.status(401).json({ success: false, message: "seller.errors.unauthorized" });
    return;
  }

  const seller = await Seller.findOne({ tenant: (req as any).tenant, userRef: uid });
  if (!seller) {
    res.status(404).json({ success: false, message: "seller.errors.notFound" });
    return;
  }

  let norm: any;
  try {
    norm = normalizeAddressInput(req.body);
  } catch (e: any) {
    res.status(400).json({ success: false, message: e?.message || "address_invalid" });
    return;
  }

  (seller as any).addresses = Array.isArray((seller as any).addresses) ? (seller as any).addresses : [];
  const firstId = (seller as any).addresses[0] || null;

  let doc;
  if (firstId) {
    doc = await Address.findOneAndUpdate(
      { _id: firstId, tenant: (req as any).tenant },
      { ...norm },
      { new: true, runValidators: true }
    );
    if (!doc) {
      doc = await Address.create({ ...norm, tenant: (req as any).tenant, sellerId: seller._id });
      (seller as any).addresses[0] = doc._id;
    }
  } else {
    doc = await Address.create({ ...norm, tenant: (req as any).tenant, sellerId: seller._id });
    (seller as any).addresses = [doc._id];
  }

  await seller.save();
  const populated = await Seller.findById(seller._id).populate("addresses");
  res.status(200).json({ success: true, message: "seller.success.updated", data: populated });
});
