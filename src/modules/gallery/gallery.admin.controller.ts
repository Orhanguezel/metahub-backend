import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Gallery } from "@/modules/gallery";
import { isValidObjectId } from "@/core/utils/validation";
import {
  processImageLocal,
  getImagePath,
  shouldProcessImage,
  getFallbackThumbnail,
} from "@/core/utils/uploadUtils";
import { UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import path from "path";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Get all gallery items (with category population)
export const getAllGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const { Gallery } = await getTenantModels(req);
    const { GalleryCategory } = await getTenantModels(req);
    const { page = "1", limit = "10", category } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const filters: any = {};

    if (category && isValidObjectId(category as string)) {
      filters.category = category;
    }

    const [items, total] = await Promise.all([
      Gallery.find(filters)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("category")
        .lean(),
      Gallery.countDocuments(filters),
    ]);

    res.status(200).json({
      success: true,
      message: "Gallery items fetched successfully.",
      data: items,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }
);

// ✅ Upload new gallery items
export const uploadGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { Gallery } = await getTenantModels(req);
    const { type = "image", category } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files?.length) {
      res.status(400).json({ success: false, message: "No files uploaded." });
      return;
    }

    if (!category || !isValidObjectId(category)) {
      res
        .status(400)
        .json({ success: false, message: "Valid category ID is required." });
      return;
    }

    if (!["image", "video"].includes(type)) {
      res.status(400).json({
        success: false,
        message: "Invalid type. Must be 'image' or 'video'.",
      });
      return;
    }

    const t_tr = Array.isArray(req.body.title_tr)
      ? req.body.title_tr
      : [req.body.title_tr];
    const t_en = Array.isArray(req.body.title_en)
      ? req.body.title_en
      : [req.body.title_en];
    const t_de = Array.isArray(req.body.title_de)
      ? req.body.title_de
      : [req.body.title_de];
    const d_tr = Array.isArray(req.body.desc_tr)
      ? req.body.desc_tr
      : [req.body.desc_tr];
    const d_en = Array.isArray(req.body.desc_en)
      ? req.body.desc_en
      : [req.body.desc_en];
    const d_de = Array.isArray(req.body.desc_de)
      ? req.body.desc_de
      : [req.body.desc_de];
    const orderArr = Array.isArray(req.body.order)
      ? req.body.order
      : [req.body.order];

    const savedItems = await Promise.all(
      files.map(async (file, index) => {
        const imagePath = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imagePath);

        if (shouldProcessImage()) {
          const localPath = path.join(
            process.cwd(),
            `${UPLOAD_BASE_PATH}/gallery/${file.filename}`
          );
          const processed = await processImageLocal(
            localPath,
            file.filename,
            path.join(process.cwd(), `${UPLOAD_BASE_PATH}/gallery`)
          );
          thumbnail = processed.thumbnail;
          webp = processed.webp;
        }

        return await Gallery.create({
          category,
          type,
          items: [
            {
              image: imagePath,
              thumbnail,
              webp,
              title: {
                tr: t_tr[index] || t_tr[0] || "",
                en: t_en[index] || t_en[0] || "",
                de: t_de[index] || t_de[0] || "",
              },
              description: {
                tr: d_tr[index] || d_tr[0] || "",
                en: d_en[index] || d_en[0] || "",
                de: d_de[index] || d_de[0] || "",
              },
              order: parseInt(orderArr[index]) || parseInt(orderArr[0]) || 0,
            },
          ],
        });
      })
    );

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${savedItems.length} item(s).`,
      data: savedItems,
    });
  }
);

// ✅ Update gallery item
export const updateGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { Gallery } = await getTenantModels(req);
    const { id } = req.params;
    const {
      category,
      type,
      isPublished,
      priority,
      title_tr,
      title_en,
      title_de,
      desc_tr,
      desc_en,
      desc_de,
      order,
    } = req.body;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const item = await Gallery.findOne({ _id: id, tenant: req.tenant });
    if (!item) {
      res.status(404).json({ success: false, message: "Media not found." });
      return;
    }

    if (category && isValidObjectId(category)) item.category = category;
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

    let removed = [];
    const removedImages = req.body["removedImages[]"] || req.body.removedImages;
    if (Array.isArray(removedImages)) removed = removedImages;
    else if (typeof removedImages === "string" && removedImages)
      removed = [removedImages];

    if (removed.length > 0) {
      item.items = item.items.filter((img) => !removed.includes(img.image));

      const fs = require("fs");
      removed.forEach((img) => {
        const filePath = path.join(
          process.cwd(),
          `${UPLOAD_BASE_PATH}/gallery/${img}`
        );
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Error deleting file ${img}:`, err);
        });
      });
      if (item.items.length === 0) {
        res.status(400).json({
          success: false,
          message: "Cannot remove all images from a gallery item.",
        });
        return;
      }
    }

    const files = req.files as Express.Multer.File[];
    if (files?.length > 0) {
      for (const file of files) {
        const imagePath = getImagePath(file);
        let { thumbnail, webp } = getFallbackThumbnail(imagePath);

        if (shouldProcessImage()) {
          const localPath = path.join(
            process.cwd(),
            `${UPLOAD_BASE_PATH}/gallery/${file.filename}`
          );
          const processed = await processImageLocal(
            localPath,
            file.filename,
            path.join(process.cwd(), `${UPLOAD_BASE_PATH}/gallery`)
          );
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
          tenant: req.tenant,
        });
      }
    }

    await item.save();

    res.status(200).json({
      success: true,
      message: "Media updated successfully.",
      data: item,
    });
  }
);

// ✅ Toggle publish
export const togglePublishGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { Gallery } = await getTenantModels(req);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const item = await Gallery.findOne({ _id: id, tenant: req.tenant });
    if (!item) {
      res.status(404).json({ success: false, message: "Media not found." });
      return;
    }

    item.isPublished = !item.isPublished;
    await item.save();

    res.status(200).json({
      success: true,
      message: `Media ${
        item.isPublished ? "published" : "unpublished"
      } successfully.`,
      data: item,
    });
  }
);

// ✅ Soft delete
export const softDeleteGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { Gallery } = await getTenantModels(req);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const item = await Gallery.findOne({ _id: id, tenant: req.tenant });
    if (!item) {
      res.status(404).json({ success: false, message: "Media not found." });
      return;
    }

    item.isActive = false;
    await item.save();

    res
      .status(200)
      .json({ success: true, message: "Media item archived successfully." });
  }
);

// ✅ Permanent delete
export const deleteGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { Gallery } = await getTenantModels(req);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const item = await Gallery.deleteOne({
      _id: id,
      tenant: req.tenant,
    }).lean();
    if (!item) {
      res.status(404).json({ success: false, message: "Media not found." });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: "Media deleted successfully." });
  }
);

// ✅ Restore soft-deleted item
export const restoreGalleryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { Gallery } = await getTenantModels(req);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const item = await Gallery.findOne({ _id: id, tenant: req.tenant });
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
  }
);

// ✅ Batch publish/unpublish
export const batchPublishGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const { Gallery } = await getTenantModels(req);
    const { ids, publish } = req.body;

    if (!Array.isArray(ids) || typeof publish !== "boolean") {
      res
        .status(400)
        .json({ success: false, message: "Invalid request body." });
      return;
    }

    const updated = await Gallery.updateMany(
      { _id: { $in: ids }, isActive: true, tenant: req.tenant },
      { $set: { isPublished: publish } }
    );

    res.status(200).json({
      success: true,
      message: `Successfully ${publish ? "published" : "unpublished"} ${
        updated.modifiedCount
      } item(s).`,
    });
  }
);

// ✅ Batch permanent delete
export const batchDeleteGalleryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const { Gallery } = await getTenantModels(req);
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid request body." });
      return;
    }

    const result = await Gallery.deleteMany({
      _id: { $in: ids },
      tenant: req.tenant,
    });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} item(s).`,
    });
  }
);
