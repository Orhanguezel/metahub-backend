import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Gallery } from "@/modules/gallery";
import { isValidObjectId } from "@/core/utils/validation";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// 📍 Thumbnail ve WebP oluştur
async function processImage(
  inputPath: string,
  filename: string,
  folder: string
) {
  const thumbnailDir = path.join(folder, "thumbnails");
  const webpDir = path.join(folder, "webp");

  if (!fs.existsSync(thumbnailDir))
    fs.mkdirSync(thumbnailDir, { recursive: true });
  if (!fs.existsSync(webpDir)) fs.mkdirSync(webpDir, { recursive: true });

  const thumbPath = path.join(thumbnailDir, filename);
  const webpFilename = filename.replace(path.extname(filename), ".webp");
  const webpPath = path.join(webpDir, webpFilename);

  await sharp(inputPath).resize(300, 200).toFile(thumbPath);
  await sharp(inputPath).webp().toFile(webpPath);

  return {
    thumbnail: `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/thumbnails/${filename}`,
    webp: `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/webp/${webpFilename}`,
  };
}

// 📤 Upload gallery item
export const uploadGalleryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Gallery } = await getTenantModels(req);
    const { type = "image", category } = req.body;
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: "No files uploaded." });
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
        const imagePath = `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/${file.filename}`;
        const localPath = path.join(
          process.cwd(),
          `${UPLOAD_BASE_PATH}/gallery/${file.filename}`
        );
        const { thumbnail, webp } = await processImage(
          localPath,
          file.filename,
          path.join(process.cwd(), `${UPLOAD_BASE_PATH}/gallery`)
        );

        const fallbackTitle = t_tr[0] || "";
        const fallbackDesc = d_tr[0] || "";

        const item = await Gallery.create({
          category,
          type,
          items: [
            {
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
            },
          ],
        });
        return item;
      })
    );

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${savedItems.length} item(s).`,
      data: savedItems,
    });
  }
);

// 📥 Get all gallery items (Admin)
export const getAllGalleryItems = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Gallery } = await getTenantModels(req);
    const { page = "1", limit = "10", category } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const filters: any = {};
    if (category) filters.category = category;

    const [items, total] = await Promise.all([
      Gallery.find(filters)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
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

// 📥 Get published gallery items (Public)
export const getPublishedGalleryItems = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Gallery } = await getTenantModels(req);
    const { page = "1", limit = "10", category } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const filters: any = { isPublished: true, isActive: true };
    if (category) filters.category = category;

    const [items, total] = await Promise.all([
      Gallery.find(filters)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Gallery.countDocuments(filters),
    ]);

    res.status(200).json({
      success: true,
      message: "Published gallery items fetched successfully.",
      data: items,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }
);

// 🗑️ Delete gallery item
export const deleteGalleryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Gallery } = await getTenantModels(req);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const item = await Gallery.deleteOne({ _id: id, tenant: req.tenant });
    if (!item) {
      res.status(404).json({ success: false, message: "Media not found." });
      return;
    }

    res
      .status(200)
      .json({ success: true, message: "Media deleted successfully." });
  }
);

// 🔄 Toggle publish
export const togglePublishGalleryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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

// 🗃️ Soft delete
export const softDeleteGalleryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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

// ✏️ Update gallery item
export const updateGalleryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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

    // ✅ Genel alanları güncelle
    if (category) item.category = category;
    if (type) item.type = type;
    if (typeof isPublished === "boolean") item.isPublished = isPublished;
    if (typeof priority !== "undefined") item.priority = parseInt(priority);

    // ✅ İçerik güncelle (ilk item üzerinden örnek)
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

    // ✅ Yeni dosya yüklenmişse işle
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const BASE_PATH = path.join(process.cwd(), `${UPLOAD_BASE_PATH}/gallery`);

      for (const file of files) {
        const imagePath = `${BASE_URL}/${UPLOAD_BASE_PATH}/gallery/${file.filename}`;
        const localPath = path.join(BASE_PATH, file.filename);
        const { thumbnail, webp } = await processImage(
          localPath,
          file.filename,
          BASE_PATH
        );

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
  }
);

//✅ 1. Restore (isActive = true)
//PATCH /gallery/:id/restore
export const restoreGalleryItem = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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

//✅ 2. Batch Publish/Unpublish
//PATCH /gallery/batch/publish → body: { ids: [], publish: true }
export const batchPublishGalleryItems = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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

//✅ 3. Batch Delete (hard delete)
//DELETE /gallery/batch → body: { ids: [] }

export const batchDeleteGalleryItems = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
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

// ✅ 1. Search + Filter
//GET /gallery?search=title_en:team&isPublished=true&isActive=true&page=1&limit=10
export const searchGalleryItems = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Gallery } = await getTenantModels(req);
    const {
      search,
      isPublished,
      isActive,
      category,
      page = "1",
      limit = "10",
    } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const filters: any = { tenant: req.tenant };
    if (category) filters.category = category;
    if (typeof isPublished !== "undefined")
      filters.isPublished = isPublished === "true";
    if (typeof isActive !== "undefined") filters.isActive = isActive === "true";

    if (search) {
      const [field, value] = (search as string).split(":");
      filters[`${field}`] = { $regex: value, $options: "i" };
    }

    const [items, total] = await Promise.all([
      Gallery.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Gallery.countDocuments(filters),
    ]);

    res.status(200).json({
      success: true,
      message: "Filtered gallery items fetched successfully.",
      data: items,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }
);

// ✅ 2. Dashboard Stats
// GET /gallery/stats
export const getGalleryStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Gallery } = await getTenantModels(req);
    const [total, published, active, categories] = await Promise.all([
      Gallery.countDocuments({ tenant: req.tenant }),
      Gallery.countDocuments({ isPublished: true, tenant: req.tenant }),
      Gallery.countDocuments({ isActive: true, tenant: req.tenant }),
      Gallery.aggregate([
        { $match: { tenant: req.tenant } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      message: "Gallery stats fetched successfully.",
      data: {
        total,
        published,
        active,
        categories: categories.reduce((acc, cur) => {
          acc[cur._id] = cur.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  }
);

// GET /gallery/:id
export const getGalleryItemById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Gallery } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid gallery ID." });
      return;
    }

    const item = await Gallery.findOne({ _id: id, tenant: req.tenant });

    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Gallery item not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Gallery item fetched successfully.",
      data: item,
    });
  }
);
