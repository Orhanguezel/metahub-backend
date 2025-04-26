import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "@/core/utils/validation";
import Wishlist from "./wishlist.models";
import { Product } from "../product"; 

// ✅ Kullanıcının Wishlist'ini getir
export const getUserWishlist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId || !isValidObjectId(userId)) {
      res.status(400).json({ message: "Invalid user ID." });
      return;
    }

    const wishlist = await Wishlist.findOne({ user: userId }).populate("products");

    if (!wishlist) {
      res.status(404).json({ message: "Wishlist not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully.",
      data: wishlist,
    });
    
    return;
  } catch (error) {
    next(error);
  }
});




// ✅ Ürünü Wishlist'e ekle
export const addToWishlist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.body;

    if (!userId || !isValidObjectId(userId) || !isValidObjectId(productId)) {
      res.status(400).json({ message: "Invalid user ID or product ID." });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found." });
      return;
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, products: [productId] });
    } else {
      const alreadyExists = wishlist.products.some(
        (id) => id.toString() === productId
      );
      if (alreadyExists) {
        res.status(400).json({ message: "Product already in wishlist." });
        return;
      }

      wishlist.products.push(productId);
      await wishlist.save();
    }

    res.status(201).json({
      success: true,
      message: "Product added to wishlist.",
      data: wishlist,
    });

    return;
  } catch (error) {
    next(error);
  }
});


// ✅ Wishlist'ten ürün çıkar
export const removeFromWishlist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;
  
      if (!userId || !isValidObjectId(userId) || !isValidObjectId(productId)) {
        res.status(400).json({ message: "Invalid user ID or product ID." });
        return;
      }
  
      const wishlist = await Wishlist.findOne({ user: userId });
  
      if (!wishlist) {
        res.status(404).json({ message: "Wishlist not found." });
        return;
      }
  
      const index = wishlist.products.findIndex(
        (id) => id.toString() === productId
      );
  
      if (index === -1) {
        res.status(404).json({ message: "Product not found in wishlist." });
        return;
      }
  
      wishlist.products.splice(index, 1);
      await wishlist.save();
  
      res.status(200).json({
        success: true,
        message: "Product removed from wishlist.",
        data: wishlist,
      });
  
      return;
    } catch (error) {
      next(error);
    }
  });

  // ✅ Wishlist'i tamamen temizle
export const clearWishlist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
  
      if (!userId || !isValidObjectId(userId)) {
        res.status(400).json({ message: "Invalid user ID." });
        return;
      }
  
      const wishlist = await Wishlist.findOne({ user: userId });
  
      if (!wishlist) {
        res.status(404).json({ message: "Wishlist not found." });
        return;
      }
  
      if (wishlist.products.length === 0) {
        res.status(400).json({ message: "Wishlist is already empty." });
        return;
      }
  
      wishlist.products = [];
      await wishlist.save();
  
      res.status(200).json({
        success: true,
        message: "Wishlist cleared successfully.",
        data: wishlist,
      });
  
      return;
    } catch (error) {
      next(error);
    }
  });
  
  