import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ForumCategory from "./forumCategory.models";

// ➕ Yeni kategori oluştur
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description } = req.body;
  const language = req.locale || "en";

  if (!name?.[language]) {
    res.status(400).json({
      success: false,
      message:
        language === "de"
          ? "Kategoriename ist erforderlich."
          : language === "tr"
          ? "Kategori adı gereklidir."
          : "Category name is required.",
    });
    return;
  }

  const category = await ForumCategory.create({
    name,
    description,
  });

  res.status(201).json({
    success: true,
    message:
      language === "de"
        ? "Kategorie erfolgreich erstellt."
        : language === "tr"
        ? "Kategori başarıyla oluşturuldu."
        : "Category created successfully.",
    category,
  });
});

// 📄 Tüm kategorileri getir
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const lang = req.locale || "en";

  const categories = await ForumCategory.find().sort({ createdAt: -1 });

  // İstenen dile göre sadece o dile ait alanları dön
  const filtered = categories.map((cat) => ({
    _id: cat._id,
    name: cat.name?.[lang],
    description: cat.description?.[lang] || "",
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));

  res.status(200).json({
    success: true,
    message:
      lang === "de"
        ? "Kategorien erfolgreich geladen."
        : lang === "tr"
        ? "Kategoriler başarıyla yüklendi."
        : "Categories fetched successfully.",
    categories: filtered,
  });
});
