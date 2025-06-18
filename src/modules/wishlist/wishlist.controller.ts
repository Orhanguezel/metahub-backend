import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
//import { Wishlist } from "@/modules/wishlist";
//import { Product } from "@/modules/product";
import { isValidObjectId } from "@/core/utils/validation";
import { Types } from "mongoose";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Kullanıcının Wishlist'ini getir
export const getUserWishlist = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const { Wishlist } = await getTenantModels(req);
    const wishlist = await Wishlist.findOne({
      user: userId,
      tenant: req.tenant,
    }).populate("products");

    if (!wishlist) {
      res.status(404).json({ success: false, message: "Wishlist not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully.",
      data: wishlist,
    });
  }
);

// ✅ Ürünü Wishlist'e ekle
export const addToWishlist = asyncHandler(
  async (req: Request, res: Response) => {
    const { Product, Wishlist } = await getTenantModels(req);
    const userId = req.user?.id;
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      tenant: req.tenant,
    });
    if (!product) {
      res.status(404).json({ success: false, message: "Product not found." });
      return;
    }

    let wishlist = await Wishlist.findOne({ user: userId, tenant: req.tenant });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, products: [productId] });
    } else {
      const alreadyExists = wishlist.products.some(
        (id) => id.toString() === productId
      );
      if (alreadyExists) {
        res
          .status(400)
          .json({ success: false, message: "Product already in wishlist." });
        return;
      }

      wishlist.products.push(new Types.ObjectId(productId));
      await wishlist.save();
    }

    res.status(201).json({
      success: true,
      message: "Product added to wishlist.",
      data: wishlist,
    });
  }
);

// ✅ Wishlist'ten ürün çıkar
export const removeFromWishlist = asyncHandler(
  async (req: Request, res: Response) => {
    const { Wishlist } = await getTenantModels(req);
    const userId = req.user?.id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({
      user: userId,
      tenant: req.tenant,
    });

    if (!wishlist) {
      res.status(404).json({ success: false, message: "Wishlist not found." });
      return;
    }

    const index = wishlist.products.findIndex(
      (id) => id.toString() === productId
    );

    if (index === -1) {
      res
        .status(404)
        .json({ success: false, message: "Product not found in wishlist." });
      return;
    }

    wishlist.products.splice(index, 1);
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist.",
      data: wishlist,
    });
  }
);

// ✅ Wishlist'i temizle
export const clearWishlist = asyncHandler(
  async (req: Request, res: Response) => {
    const { Wishlist } = await getTenantModels(req);
    const userId = req.user?.id;

    const wishlist = await Wishlist.findOne({
      user: userId,
      tenant: req.tenant,
    });

    if (!wishlist) {
      res.status(404).json({ success: false, message: "Wishlist not found." });
      return;
    }

    if (wishlist.products.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "Wishlist is already empty." });
      return;
    }

    wishlist.products = [];
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully.",
      data: wishlist,
    });
  }
);
