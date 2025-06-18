import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Favorite } from "./favorite.model";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Get user's favorites
export const getFavorites = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Favorite } = await getTenantModels(req);
    const userId = req.user?.id;
    const favorites = await Favorite.find({
      userId,
      tenant: req.tenant,
    }).select("productId -_id");
    const favoriteIds = favorites.map((fav) => fav.productId);
    res.status(200).json({
      success: true,
      data: favoriteIds,
    });
  }
);

// ✅ Add to favorites
export const addFavorite = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Favorite } = await getTenantModels(req);
    const { productId } = req.body;
    const userId = req.user?.id;

    if (!isValidObjectId(productId)) {
      res.status(400).json({ success: false, message: "Invalid product ID." });
      return;
    }

    const exists = await Favorite.findOne({
      userId,
      productId,
      tenant: req.tenant,
    });
    if (exists) {
      res
        .status(400)
        .json({ success: false, message: "Product is already in favorites." });
      return;
    }

    const newFavorite = await Favorite.create({
      userId,
      productId,
      tenant: req.tenant,
    });
    res.status(201).json({
      success: true,
      message: "Product added to favorites.",
      data: newFavorite,
    });
  }
);

// ✅ Remove from favorites
export const removeFavorite = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Favorite } = await getTenantModels(req);
    const { productId } = req.params;
    const userId = req.user?.id;

    if (!isValidObjectId(productId)) {
      res.status(400).json({ success: false, message: "Invalid product ID." });
      return;
    }

    const deleted = await Favorite.findOneAndDelete({
      userId,
      productId,
      tenant: req.tenant,
    });

    if (!deleted) {
      res.status(404).json({ success: false, message: "Favorite not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Removed from favorites.",
    });
  }
);

// ✅ Admin - Get all favorites
export const getAllFavorites = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { Favorite } = await getTenantModels(req);
    const favorites = await Favorite.find({ tenant: req.tenant })
      .populate("userId", "name email")
      .populate("productId", "name price");

    res.status(200).json({
      success: true,
      message: "All favorites fetched successfully.",
      data: favorites,
    });
  }
);
