import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Library } from "@/modules/library";
import { BASE_URL, UPLOAD_BASE_PATH } from "@/core/middleware/uploadMiddleware";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Create Library Item
export const createLibraryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { Library } = await getTenantModels(req);
    const {
      category,
      tags = [],
      fileType = "pdf",
      isPublished = false,
    } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "File upload is required." });
      return;
    }

    const fileUrl = `${BASE_URL}/${UPLOAD_BASE_PATH}/library/${files[0].filename}`;
    const createdItems = [];

    for (const lang of ["tr", "en", "de"] as const) {
      const title = req.body[`title_${lang}`];
      const description = req.body[`description_${lang}`];
      if (!title || !description) continue;

      const slugBase = title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");
      const finalSlug = `${slugBase}-${lang}`;

      const item = await Library.create({
        title: { [lang]: title },
        slug: finalSlug,
        tenant: req.tenant,
        description: { [lang]: description },
        category,
        tags: typeof tags === "string" ? JSON.parse(tags) : tags,
        fileType,
        fileUrl,
        isPublished: isPublished === "true" || isPublished === true,
      });

      createdItems.push(item);
    }

    if (createdItems.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one valid language field is required.",
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Library item(s) created successfully.",
      items: createdItems,
    });
  }
);

// ✅ Get All Library Items (by language filter)
export const getAllLibraryItems = asyncHandler(
  async (req: Request, res: Response) => {
    const { Library } = await getTenantModels(req);
    const lang = req.query.lang || "en";
    const filter: any = {
      [`title.${lang}`]: { $exists: true },
      tenant: req.tenant,
    };

    const items = await Library.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Library items fetched successfully.",
      data: items,
    });
  }
);

// ✅ Get Library Item by Slug
export const getLibraryItemBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { Library } = await getTenantModels(req);
    const { slug } = req.params;

    const item = await Library.findOne({ slug, tenant: req.tenant });
    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Library item not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  }
);

// ✅ Get Library Item by ID
export const getLibraryItemById = asyncHandler(
  async (req: Request, res: Response) => {
    const { Library } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid library item ID." });
      return;
    }

    const item = await Library.findOne({ _id: id, tenant: req.tenant });
    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Library item not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  }
);

// ✅ Update Library Item
export const updateLibraryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { Library } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid library item ID." });
      return;
    }

    const updates: any = { ...req.body };

    if (req.file) {
      updates.fileUrl = `${BASE_URL}/${UPLOAD_BASE_PATH}/library/${req.file.filename}`;
    }

    const updated = await Library.findByIdAndUpdate(
      { _id: id, tenant: req.tenant },
      updates,
      {
        new: true,
      }
    );

    if (!updated) {
      res
        .status(404)
        .json({ success: false, message: "Library item not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Library item updated successfully.",
      data: updated,
    });
  }
);

// ✅ Delete Library Item (hard delete)
export const deleteLibraryItem = asyncHandler(
  async (req: Request, res: Response) => {
    const { Library } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid library item ID." });
      return;
    }

    const deleted = await Library.deleteOne({ _id: id, tenant: req.tenant });
    if (!deleted) {
      res
        .status(404)
        .json({ success: false, message: "Library item not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Library item deleted successfully.",
    });
  }
);
