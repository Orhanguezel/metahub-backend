import type { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import multer from "multer";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import { buildTenantFolder, deleteFromCloudinary, uploadBufferToCloudinary } from "./service";
import cloudinary from "./cloudinary";

/** Multer memory storage */
export const uploadMW = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/** GET /media/admin */
export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const { MediaAsset } = await getTenantModels(req);
  const { q, tag, page = "1", limit = "20" } = req.query as Record<string, string>;

  const filter: any = { tenant: req.tenant };
  if (tag) filter.tags = tag;
  if (q && q.trim()) filter.$or = [
    { publicId: { $regex: q.trim(), $options: "i" } },
    { url: { $regex: q.trim(), $options: "i" } },
    { tags: q.trim() },
  ];

  const p = Math.max(1, parseInt(page || "1", 10));
  const l = Math.min(200, Math.max(1, parseInt(limit || "20", 10)));
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    MediaAsset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean(),
    MediaAsset.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, data: items, meta: { page: p, limit: l, total } });
});

/** GET /media/admin/:id */
export const adminGetById = asyncHandler(async (req: Request, res: Response) => {
  const { MediaAsset } = await getTenantModels(req);
  const doc = await MediaAsset.findOne({ _id: req.params.id, tenant: req.tenant }).lean();
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.status(200).json({ success: true, data: doc });
});

/** POST /media/admin/upload (multipart/form-data; field: file) */
export const adminUpload = asyncHandler(async (req: Request, res: Response) => {
  const { MediaAsset } = await getTenantModels(req);
  const file = (req as any).file as Express.Multer.File | undefined;
  const { tags = [], filename, mime } = req.body as { tags?: string[]; filename?: string; mime?: string };

  if (!file?.buffer) { res.status(400).json({ success: false, message: "file_required" }); return; }

  const folder = buildTenantFolder(req.tenant!);
  const eager = [
    { quality: "auto", fetch_format: "webp" as const, format: "webp" },
    { width: 512, height: 512, crop: "limit" as const, quality: "auto", fetch_format: "auto" as const },
  ];

  const up = await uploadBufferToCloudinary({
    buffer: file.buffer,
    mimetype: mime || file.mimetype,
    filename: filename || file.originalname,
    folder,
    eager,
    resourceType: "auto",
  });

  const webpUrl = up?.eager?.[0]?.secure_url || undefined;
  const thumbUrl = up?.eager?.[1]?.secure_url || undefined;

  const doc = await MediaAsset.create({
    tenant: req.tenant,
    publicId: up.public_id,
    url: up.secure_url,
    thumbnail: thumbUrl,
    webp: webpUrl,
    width: up.width,
    height: up.height,
    mime: mime || file.mimetype,
    tags: Array.isArray(tags) ? tags : [],
  });

  res.status(201).json({ success: true, message: "uploaded", data: doc });
});

/** PUT /media/admin/:id/tags  { tags: string[] } */
export const adminUpdateTags = asyncHandler(async (req: Request, res: Response) => {
  const { MediaAsset } = await getTenantModels(req);
  const { tags } = req.body as { tags: string[] };

  const doc = await MediaAsset.findOneAndUpdate(
    { _id: req.params.id, tenant: req.tenant },
    { $set: { tags: Array.isArray(tags) ? tags : [] } },
    { new: true }
  ).lean();

  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }
  res.status(200).json({ success: true, message: "tags_updated", data: doc });
});

/** PUT /media/admin/:id/replace (multipart file) */
export const adminReplace = asyncHandler(async (req: Request, res: Response) => {
  const { MediaAsset } = await getTenantModels(req);
  const file = (req as any).file as Express.Multer.File | undefined;
  const { filename, mime } = req.body as { filename?: string; mime?: string };

  const existing = await MediaAsset.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!existing) { res.status(404).json({ success: false, message: "not_found" }); return; }
  if (!file?.buffer) { res.status(400).json({ success: false, message: "file_required" }); return; }

  // eski dosyayı sil (best effort)
  if (existing.publicId) {
    try { await deleteFromCloudinary(existing.publicId, "auto"); } catch { /* noop */ }
  }

  const folder = buildTenantFolder(req.tenant!);
  const up = await uploadBufferToCloudinary({
    buffer: file.buffer,
    mimetype: mime || file.mimetype,
    filename: filename || file.originalname,
    folder,
    eager: [
      { quality: "auto", fetch_format: "webp" as const, format: "webp" },
      { width: 512, height: 512, crop: "limit" as const, quality: "auto", fetch_format: "auto" as const },
    ],
    resourceType: "auto",
  });

  const webpUrl = up?.eager?.[0]?.secure_url || undefined;
  const thumbUrl = up?.eager?.[1]?.secure_url || undefined;

  (existing as any).publicId = up.public_id;
  (existing as any).url = up.secure_url;
  (existing as any).thumbnail = thumbUrl;
  (existing as any).webp = webpUrl;
  (existing as any).width = up.width;
  (existing as any).height = up.height;
  (existing as any).mime = mime || file.mimetype;
  await (existing as any).save();

  res.status(200).json({ success: true, message: "replaced", data: existing.toObject() });
});

/** DELETE /media/admin/:id */
export const adminDelete = asyncHandler(async (req: Request, res: Response) => {
  const { MediaAsset } = await getTenantModels(req);
  const doc = await MediaAsset.findOne({ _id: req.params.id, tenant: req.tenant });
  if (!doc) { res.status(404).json({ success: false, message: "not_found" }); return; }

  if (doc.publicId) {
    try { await deleteFromCloudinary(doc.publicId, "auto"); } catch { /* noop */ }
  }
  await (doc as any).deleteOne();

  res.status(200).json({ success: true, message: "deleted" });
});

/** POST /media/admin/signed-params { folder? }  → client direct upload için */
export const adminSignedParams = asyncHandler(async (req: Request, res: Response) => {
  if (!cloudinary.config().cloud_name) {
    res.status(400).json({ success: false, message: "cloudinary_not_configured" }); return;
  }
  const ts = Math.floor(Date.now() / 1000);
  const folder = req.body?.folder || buildTenantFolder(req.tenant!);

  const paramsToSign = { timestamp: ts, folder };
  const signature = (cloudinary.utils as any).api_sign_request(
    paramsToSign,
    cloudinary.config().api_secret
  );

  res.status(200).json({
    success: true,
    data: {
      cloudName: cloudinary.config().cloud_name,
      apiKey: cloudinary.config().api_key,
      timestamp: ts,
      folder,
      signature,
    },
  });
});
