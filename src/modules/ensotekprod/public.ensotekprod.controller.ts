import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { EnsotekProd } from "@/modules/ensotekprod";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Get All Published Ensotek Products (Public)
export const getAllEnsotekProd = asyncHandler(
  async (req: Request, res: Response) => {
    const { EnsotekProd } = await getTenantModels(req);
    const { category, language } = req.query;
    const filter: Record<string, any> = {
      isActive: true,
      isPublished: true,
      tenant: req.tenant,
    };

    if (category && isValidObjectId(category.toString())) {
      filter.category = category;
    }

    if (
      language &&
      typeof language === "string" &&
      ["tr", "en", "de"].includes(language)
    ) {
      filter[`name.${language}`] = { $exists: true };
    }

    const products = await EnsotekProd.find(filter)
      .populate("comments")
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Product list fetched successfully.",
      data: products,
    });
  }
);

// ✅ Get Product by ID (Public)
export const getEnsotekProdById = asyncHandler(
  async (req: Request, res: Response) => {
    const { EnsotekProd } = await getTenantModels(req);
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid product ID." });
      return;
    }

    const product = await EnsotekProd.findOne({
      _id: id,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "name")
      .lean();

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product fetched successfully.",
      data: product,
    });
  }
);

// ✅ Get Product by Slug (Public)
export const getEnsotekProdBySlug = asyncHandler(
  async (req: Request, res: Response) => {
    const { EnsotekProd } = await getTenantModels(req);
    const { slug } = req.params;

    const product = await EnsotekProd.findOne({
      slug,
      tenant: req.tenant,
      isActive: true,
      isPublished: true,
    })
      .populate("comments")
      .populate("category", "name")
      .lean();

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product fetched successfully.",
      data: product,
    });
  }
);
