// src/modules/storefront/admin.controller.ts
import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import multer from "multer";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { buildTenantFolder, uploadBufferToCloudinary } from "@/modules/media/service";

/** Mevcut admin uçları (getAdminSettings, upsertSettings) korunuyor */
export { getAdminSettings, upsertSettings } from "./admin.basic.controller"; // mevcut dosyanı böyle adlandırdıysan uyarlayabilirsin

/** Local memory uploader (banner için) */
export const bannerUploadMW = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
});

/** küçük yardımcı */
const ensureSettingsDoc = async (tenant: string, StorefrontSettings: any) => {
    const doc = await StorefrontSettings.findOne({ tenant });
    if (doc) return doc;
    return new StorefrontSettings({
        tenant,
        currency: "USD",
        locale: "tr-TR",
        priceIncludesTax: false,
        measurement: "metric",
        menus: [],
        banners: [],
        featuredCategories: [],
        featuredProducts: [],
        socials: {},
    }).save();
};

const genKey = () => `bnr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** POST /storefront/admin/banners  (var olan MediaAsset ile banner ekle) */
export const addBannerFromMedia = asyncHandler(async (req: Request, res: Response) => {
    const { StorefrontSettings, MediaAsset } = await getTenantModels(req);
    const { mediaId, position, title, subtitle, href, isActive = true, order = 0, key } = req.body as any;

    const asset = await MediaAsset.findOne({ _id: mediaId, tenant: req.tenant }).lean();
    if (!asset) { res.status(404).json({ success: false, message: "media_not_found" }); return; }

    const doc = await ensureSettingsDoc(req.tenant!, StorefrontSettings);

    const banner = {
        key: key || genKey(),
        mediaId: asset._id,
        image: asset.url,
        thumbnail: asset.thumbnail,
        webp: asset.webp,
        meta: { width: asset.width, height: asset.height, mime: asset.mime },
        position,
        title,
        subtitle,
        href,
        isActive: !!isActive,
        order: Number(order) || 0,
    };

    (doc as any).banners.push(banner);
    await (doc as any).save();

    res.status(201).json({ success: true, message: "banner_added", data: banner });
});

/** POST /storefront/admin/banners/upload  (dosya yükle, MediaAsset oluştur, banner ekle) */
export const uploadBanner = asyncHandler(async (req: Request, res: Response) => {
    const { StorefrontSettings, MediaAsset } = await getTenantModels(req);
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file?.buffer) { res.status(400).json({ success: false, message: "file_required" }); return; }

    const { position, title, subtitle, href, isActive = true, order = 0, key } = req.body as any;

    const folder = `${buildTenantFolder(req.tenant!)}/storefront/banners`;
    const up = await uploadBufferToCloudinary({
        buffer: file.buffer,
        mimetype: file.mimetype,
        filename: file.originalname,
        folder,
        eager: [
            { quality: "auto", fetch_format: "webp" as const, format: "webp" },
            { width: 512, height: 512, crop: "limit" as const, quality: "auto", fetch_format: "auto" as const },
        ],
        resourceType: "auto",
    });

    const webpUrl = up?.eager?.[0]?.secure_url || undefined;
    const thumbUrl = up?.eager?.[1]?.secure_url || undefined;

    const asset = await MediaAsset.create({
        tenant: req.tenant,
        publicId: up.public_id,
        url: up.secure_url,
        thumbnail: thumbUrl,
        webp: webpUrl,
        width: up.width,
        height: up.height,
        mime: file.mimetype,
        tags: ["banner", position].filter(Boolean),
    });

    const doc = await ensureSettingsDoc(req.tenant!, StorefrontSettings);

    const banner = {
        key: key || genKey(),
        mediaId: asset._id,
        image: asset.url,
        thumbnail: asset.thumbnail,
        webp: asset.webp,
        meta: { width: asset.width, height: asset.height, mime: asset.mime },
        position,
        title,
        subtitle,
        href,
        isActive: !!isActive,
        order: Number(order) || 0,
    };

    (doc as any).banners.push(banner);
    await (doc as any).save();

    res.status(201).json({ success: true, message: "banner_uploaded", data: banner });
});

/** PUT /storefront/admin/banners/:key  (alanlar + opsiyonel yeni mediaId) */
export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
    const { StorefrontSettings, MediaAsset } = await getTenantModels(req);
    const { key } = req.params;
    const { mediaId, position, title, subtitle, href, isActive, order } = req.body as any;

    const doc = await StorefrontSettings.findOne({ tenant: req.tenant });
    if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

    const idx = (doc as any).banners.findIndex((b: any) => String(b.key) === String(key));
    if (idx === -1) { res.status(404).json({ success: false, message: "banner_not_found" }); return; }

    const b = (doc as any).banners[idx];

    if (mediaId) {
        const asset = await MediaAsset.findOne({ _id: mediaId, tenant: req.tenant }).lean();
        if (!asset) { res.status(404).json({ success: false, message: "media_not_found" }); return; }
        b.mediaId = asset._id;
        b.image = asset.url;
        b.thumbnail = asset.thumbnail;
        b.webp = asset.webp;
        b.meta = { width: asset.width, height: asset.height, mime: asset.mime };
    }

    if (position !== undefined) b.position = position;
    if (title !== undefined) b.title = title;
    if (subtitle !== undefined) b.subtitle = subtitle;
    if (href !== undefined) b.href = href;
    if (isActive !== undefined) b.isActive = !!isActive;
    if (order !== undefined) b.order = Number(order);

    (doc as any).banners[idx] = b;
    await (doc as any).save();

    res.status(200).json({ success: true, message: "banner_updated", data: b });
});

/** DELETE /storefront/admin/banners/:key  (yalnızca ayardan çıkarır) */
export const removeBanner = asyncHandler(async (req: Request, res: Response) => {
    const { StorefrontSettings } = await getTenantModels(req);
    const { key } = req.params;

    const doc = await StorefrontSettings.findOne({ tenant: req.tenant });
    if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

    const before = (doc as any).banners.length;
    (doc as any).banners = (doc as any).banners.filter((b: any) => String(b.key) !== String(key));
    const after = (doc as any).banners.length;

    if (before === after) { res.status(404).json({ success: false, message: "banner_not_found" }); return; }

    await (doc as any).save();
    res.status(200).json({ success: true, message: "banner_removed" });
});

/** PUT /storefront/admin/banners/reorder  { orders:[{key,order}] } */
export const reorderBanners = asyncHandler(async (req: Request, res: Response) => {
    const { StorefrontSettings } = await getTenantModels(req);
    const { orders } = req.body as { orders: Array<{ key: string; order: number }> };

    const doc = await StorefrontSettings.findOne({ tenant: req.tenant });
    if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

    const map = new Map(orders.map((o) => [String(o.key), Number(o.order)]));
    (doc as any).banners = (doc as any).banners.map((b: any) => ({
        ...b,
        order: map.has(String(b.key)) ? Number(map.get(String(b.key))) : b.order,
    }));

    // sıralı saklamak istersen:
    (doc as any).banners.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    await (doc as any).save();

    res.status(200).json({ success: true, message: "reordered", data: (doc as any).banners });
});
