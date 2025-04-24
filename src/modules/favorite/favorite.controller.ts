// src/modules/favorite/favorite.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Favorite from "./favorite.model";

// 📌 Kullanıcının favorilerini getir
export const getFavorites = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const favorites = await Favorite.find({ userId }).select("productId -_id");
  const favoriteIds = favorites.map((fav) => fav.productId);
  res.status(200).json(favoriteIds);
});

// ➕ Favorilere ürün ekle
export const addFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.body;
  const userId = req.user?.id;

  const exists = await Favorite.findOne({ userId, productId });
  if (exists) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Dieses Produkt ist bereits in den Favoriten."
          : req.locale === "tr"
          ? "Bu ürün zaten favorilerde."
          : "Product already in favorites.",
    });
    return;
  }

  const newFavorite = await Favorite.create({ userId, productId });
  res.status(201).json(newFavorite);
});

// ❌ Favoriden ürün kaldır
export const removeFavorite = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const userId = req.user?.id;

  await Favorite.findOneAndDelete({ userId, productId });

  res.status(200).json({
    message:
      req.locale === "de"
        ? "Favorit entfernt."
        : req.locale === "tr"
        ? "Favoriden kaldırıldı."
        : "Removed from favorites.",
  });
});
