// src/controllers/product.controller.ts
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {Product} from "./product.models";
import StockMovement from "../stockmovement/stockmovement.models";
import { BASE_URL, UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import fs from "fs";
import path from "path";

// ✅ Ürün oluştur
export const createProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description, price, category, tags = [], stock, stockThreshold } = req.body;
  const locale = req.locale;

  if (!name || !price || !category || stock === undefined) {
    res.status(400).json({
      message: locale === "de"
        ? "Name, Preis, Kategorie oder Lager fehlen."
        : locale === "tr"
        ? "İsim, fiyat, kategori veya stok bilgisi eksik."
        : "Missing required fields: name, price, category or stock."
    });
    return;
  }

  const images = req.files as Express.Multer.File[];
  const imageUrls = images?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/product-images/${file.filename}`) || [];

  const product = await Product.create({
    name,
    description,
    price,
    category,
    images: imageUrls,
    tags,
    stock,
    stockThreshold: stockThreshold ?? 5,
  });

  await StockMovement.create({
    product: product._id,
    type: "increase",
    quantity: stock,
    note: "Product created with initial stock",
    createdBy: req.user?._id || null,
  });

  res.status(201).json({
    message: locale === "de"
      ? "Produkt erfolgreich erstellt."
      : locale === "tr"
      ? "Ürün başarıyla oluşturuldu."
      : "Product created successfully.",
    product,
  });
});

// ✅ Tüm ürünleri getir (filtreli)
export const getAllProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { category, isActive, tags, name } = req.query;
  const filter: any = {};

  if (category) filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (tags) {
    const tagsArray = (tags as string).split(",").map((tag) => tag.trim());
    filter.tags = { $in: tagsArray };
  }
  if (name) {
    filter[`name.${req.locale}`] = { $regex: new RegExp(name as string, "i") };
  }

  const products = await Product.find(filter).populate("category").sort({ createdAt: -1 });
  res.status(200).json(products);
});

// ✅ Tek ürün getir
export const getProductById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const product = await Product.findById(req.params.id).populate("category");

  if (!product) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Produkt nicht gefunden."
        : req.locale === "tr"
        ? "Ürün bulunamadı."
        : "Product not found",
    });
    return;
  }

  res.status(200).json(product);
});

// ✅ Ürün güncelle
export const updateProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = { ...req.body };

  const product = await Product.findById(id);
  if (!product) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Produkt nicht gefunden."
        : req.locale === "tr"
        ? "Ürün bulunamadı."
        : "Product not found",
    });
    return;
  }

  const oldStock = product.stock;

  product.name = updates.name ?? product.name;
  product.description = updates.description ?? product.description;
  product.price = updates.price ?? product.price;
  product.category = updates.category ?? product.category;
  product.stockThreshold = updates.stockThreshold ?? product.stockThreshold;
  product.isActive = typeof updates.isActive !== "undefined" ? updates.isActive === "true" : product.isActive;
  product.isPublished = typeof updates.isPublished !== "undefined" ? updates.isPublished === "true" : product.isPublished;

  if (updates.tags) {
    try {
      product.tags = typeof updates.tags === "string" ? JSON.parse(updates.tags) : updates.tags;
    } catch {}
  }

  if (updates.stock !== undefined && updates.stock !== oldStock) {
    const diff = Number(updates.stock) - Number(oldStock);
    const movementType = diff > 0 ? "increase" : "decrease";

    product.stock = Number(updates.stock);

    await StockMovement.create({
      product: product._id,
      type: movementType,
      quantity: Math.abs(diff),
      note: "Stock manually updated",
      createdBy: req.user?._id || null,
    });
  }

  const files = req.files as Express.Multer.File[];
  const newImages = files?.map(file => `${BASE_URL}/${UPLOAD_BASE_PATH}/product-images/${file.filename}`) || [];
  if (newImages.length > 0) product.images = [...product.images, ...newImages];

  if (updates.removedImages) {
    try {
      const removed = JSON.parse(updates.removedImages);
      product.images = product.images.filter((img: string) => !removed.includes(img));

      removed.forEach((imgUrl: string) => {
        const relativePath = imgUrl.replace(`${BASE_URL}/`, "");
        const fullPath = path.join("uploads", relativePath);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });
    } catch {}
  }

  await product.save();

  res.status(200).json({
    message: req.locale === "de"
      ? "Produkt erfolgreich aktualisiert."
      : req.locale === "tr"
      ? "Ürün başarıyla güncellendi."
      : "Product updated successfully",
    product,
  });
});

// ✅ Ürün sil
export const deleteProduct = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Produkt nicht gefunden oder bereits gelöscht."
        : req.locale === "tr"
        ? "Ürün bulunamadı veya zaten silinmiş."
        : "Product not found or already deleted",
    });
    return;
  }

  if (product.images && Array.isArray(product.images)) {
    product.images.forEach((imgUrl) => {
      const relativePath = imgUrl.replace(`${BASE_URL}/`, "");
      const fullPath = path.join("uploads", relativePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });
  }

  await StockMovement.deleteMany({ product: product._id });
  await product.deleteOne();

  res.status(200).json({
    message: req.locale === "de"
      ? "Produkt erfolgreich gelöscht."
      : req.locale === "tr"
      ? "Ürün başarıyla silindi."
      : "Product deleted successfully",
  });
});

// ✅ Yayın durumu değiştir
export const togglePublishStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404).json({
      message: req.locale === "de"
        ? "Produkt nicht gefunden."
        : req.locale === "tr"
        ? "Ürün bulunamadı."
        : "Product not found",
    });
    return;
  }

  product.isPublished = !product.isPublished;
  await product.save();

  res.status(200).json({
    message: product.isPublished
      ? req.locale === "de"
        ? "Produkt wurde veröffentlicht."
        : req.locale === "tr"
        ? "Ürün yayınlandı."
        : "Product published."
      : req.locale === "de"
      ? "Produkt wurde unveröffentlicht."
      : req.locale === "tr"
      ? "Ürün yayından kaldırıldı."
      : "Product unpublished.",
    isPublished: product.isPublished,
    _id: product._id,
  });
});
