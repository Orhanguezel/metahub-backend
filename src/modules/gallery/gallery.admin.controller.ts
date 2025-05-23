import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Gallery } from "@/modules/gallery";
import { isValidObjectId } from "@/core/utils/validation";
import {
  processImageLocal,
  getImagePath,
  shouldProcessImage,
  getFallbackThumbnail
} from "@/core/utils/uploadUtils";
import { UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import path from "path";

export const getAllGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const { page = "1", limit = "10", category } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;
  const filters: any = {};
  if (category) filters.category = category;

  const [items, total] = await Promise.all([
    Gallery.find(filters).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Gallery.countDocuments(filters),
  ]);

  res.status(200).json({
    success: true,
    message: "Gallery items fetched successfully.",
    data: items,
    pagination: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) },
  });
});

export const uploadGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const { type = "image", category } = req.body;
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ success: false, message: "No files uploaded." });
    return;
  }

  const t_tr = Array.isArray(req.body.title_tr) ? req.body.title_tr : [req.body.title_tr];
  const t_en = Array.isArray(req.body.title_en) ? req.body.title_en : [req.body.title_en];
  const t_de = Array.isArray(req.body.title_de) ? req.body.title_de : [req.body.title_de];
  const d_tr = Array.isArray(req.body.desc_tr) ? req.body.desc_tr : [req.body.desc_tr];
  const d_en = Array.isArray(req.body.desc_en) ? req.body.desc_en : [req.body.desc_en];
  const d_de = Array.isArray(req.body.desc_de) ? req.body.desc_de : [req.body.desc_de];
  const orderArr = Array.isArray(req.body.order) ? req.body.order : [req.body.order];

  const savedItems = await Promise.all(
    files.map(async (file, index) => {
      const imagePath = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imagePath);

      if (shouldProcessImage()) {
        const localPath = path.join(process.cwd(), `${UPLOAD_BASE_PATH}/gallery/${file.filename}`);
        const processed = await processImageLocal(localPath, file.filename, path.join(process.cwd(), `${UPLOAD_BASE_PATH}/gallery`));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }

      const fallbackTitle = t_tr[0] || "";
      const fallbackDesc = d_tr[0] || "";

      const item = await Gallery.create({
        category,
        type,
        items: [{
          image: imagePath,
          thumbnail,
          webp,
          title: {
            tr: t_tr[index] || fallbackTitle,
            en: t_en[index] || fallbackTitle,
            de: t_de[index] || fallbackTitle,
          },
          description: {
            tr: d_tr[index] || fallbackDesc,
            en: d_en[index] || fallbackDesc,
            de: d_de[index] || fallbackDesc,
          },
          order: parseInt(orderArr[index]) || parseInt(orderArr[0]) || 0,
        }],
      });
      return item;
    })
  );

  res.status(201).json({
    success: true,
    message: `Successfully uploaded ${savedItems.length} item(s).`,
    data: savedItems,
  });
});

export const updateGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { category, type, isPublished, priority, title_tr, title_en, title_de, desc_tr, desc_en, desc_de, order } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid gallery ID." });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ success: false, message: "Media not found." });
    return;
  }

  if (category) item.category = category;
  if (type) item.type = type;
  if (typeof isPublished === "boolean") item.isPublished = isPublished;
  if (typeof priority !== "undefined") item.priority = parseInt(priority);

  if (item.items.length > 0) {
    const firstItem = item.items[0];
    if (title_tr) firstItem.title.tr = title_tr;
    if (title_en) firstItem.title.en = title_en;
    if (title_de) firstItem.title.de = title_de;
    if (desc_tr) firstItem.description.tr = desc_tr;
    if (desc_en) firstItem.description.en = desc_en;
    if (desc_de) firstItem.description.de = desc_de;
    if (typeof order !== "undefined") firstItem.order = parseInt(order);
  }

  const files = req.files as Express.Multer.File[];
  if (files && files.length > 0) {
    for (const file of files) {
      const imagePath = getImagePath(file);
      let { thumbnail, webp } = getFallbackThumbnail(imagePath);

      if (shouldProcessImage()) {
        const localPath = path.join(process.cwd(), `${UPLOAD_BASE_PATH}/gallery/${file.filename}`);
        const processed = await processImageLocal(localPath, file.filename, path.join(process.cwd(), `${UPLOAD_BASE_PATH}/gallery`));
        thumbnail = processed.thumbnail;
        webp = processed.webp;
      }

      item.items.push({
        image: imagePath,
        thumbnail,
        webp,
        title: { tr: "", en: "", de: "" },
        description: { tr: "", en: "", de: "" },
        order: 0,
      });
    }
  }

  await item.save();

  res.status(200).json({
    success: true,
    message: "Media updated successfully.",
    data: item,
  });
});

export const togglePublishGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid gallery ID." });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ success: false, message: "Media not found." });
    return;
  }

  item.isPublished = !item.isPublished;
  await item.save();

  res.status(200).json({
    success: true,
    message: `Media ${item.isPublished ? "published" : "unpublished"} successfully.`,
    data: item,
  });
});

export const softDeleteGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid gallery ID." });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ success: false, message: "Media not found." });
    return;
  }

  item.isActive = false;
  await item.save();

  res.status(200).json({ success: true, message: "Media item archived successfully." });
});

export const deleteGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid gallery ID." });
    return;
  }

  const item = await Gallery.findByIdAndDelete(id).lean();
  if (!item) {
    res.status(404).json({ success: false, message: "Media not found." });
    return;
  }

  res.status(200).json({ success: true, message: "Media deleted successfully." });
});

export const restoreGalleryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid gallery ID." });
    return;
  }

  const item = await Gallery.findById(id);
  if (!item) {
    res.status(404).json({ success: false, message: "Media not found." });
    return;
  }

  item.isActive = true;
  await item.save();

  res.status(200).json({
    success: true,
    message: "Media item restored successfully.",
    data: item,
  });
});

export const batchPublishGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const { ids, publish } = req.body;

  if (!Array.isArray(ids) || typeof publish !== "boolean") {
    res.status(400).json({ success: false, message: "Invalid request body." });
    return;
  }

  const updated = await Gallery.updateMany(
    { _id: { $in: ids }, isActive: true },
    { $set: { isPublished: publish } }
  );

  res.status(200).json({
    success: true,
    message: `Successfully ${publish ? "published" : "unpublished"} ${updated.modifiedCount} item(s).`,
  });
});

export const batchDeleteGalleryItems = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    res.status(400).json({ success: false, message: "Invalid request body." });
    return;
  }

  const result = await Gallery.deleteMany({ _id: { $in: ids } });

  res.status(200).json({
    success: true,
    message: `Successfully deleted ${result.deletedCount} item(s).`,
  });
});
