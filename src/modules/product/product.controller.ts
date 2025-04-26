import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { Product } from "./product.models";

// Get All Products
export const getAllProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category, isActive, tags, name } = req.query;
    const filter: any = {};

    if (category) {
      filter.category = category;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (tags) {
      const tagsArray = (tags as string).split(",").map((tag) => tag.trim());
      filter.tags = { $in: tagsArray };
    }

    if (name) {
      filter["name.en"] = { $regex: new RegExp(name as string, "i") };
    }

    const products = await Product.find(filter).populate("category").sort({ createdAt: -1 });

    res.status(200).json(products);

    return;
  } catch (error) {
    next(error);
  }
});

// Get Single Product by ID
export const getProductById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).populate("category");

    if (!product) {
      res.status(404).json({
        message: "Product not found.",
      });
      return;
    }

    res.status(200).json(product);

    return;
  } catch (error) {
    next(error);
  }
});
