import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Category from "./category.models";
import slugify from "slugify";
import { BASE_URL } from "../../core/middleware/uploadMiddleware";

// 🔄 Çok dilli kategori oluştur (TR / EN / DE)
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
  const { description, isActive } = req.body;

  const files = req.files as Express.Multer.File[];
  const previewImage = files?.[0]?.filename || null;
  const imageUrl = previewImage ? `${BASE_URL}/uploads/category-images/${previewImage}` : "category.png";

  const createdCategories = [];

  for (const lang of langs) {
    const name = req.body[`name_${lang}`];
    if (!name) continue;

    const slug = slugify(name, { lower: true });

    const existing = await Category.findOne({ slug, language: lang });
    if (existing) continue;

    const category = await Category.create({
      name,
      slug,
      description,
      language: lang,
      isActive: typeof isActive === "boolean" ? isActive : true,
      image: imageUrl,
    });

    createdCategories.push(category);
  }

  if (createdCategories.length === 0) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Keine neuen Kategorien erstellt."
          : req.locale === "tr"
          ? "Yeni kategori oluşturulamadı."
          : "No new categories were created.",
    });
    return;
  }

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Kategorie(n) erfolgreich erstellt."
        : req.locale === "tr"
        ? "Kategori(ler) başarıyla oluşturuldu."
        : "Category(ies) created successfully.",
    categories: createdCategories,
  });
});


// 📄 Tüm kategorileri getir (opsiyonel dil + aktif filtreli)
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const { isActive, language } = req.query;

  const filter: any = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";
  filter.language = language || req.locale || "en";

  const categories = await Category.find(filter).sort({ name: 1 });
  res.status(200).json(categories);
});

// 🔍 ID ile kategori getir
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Kategorie nicht gefunden."
          : req.locale === "tr"
          ? "Kategori bulunamadı."
          : "Category not found.",
    });
    return;
  }
  res.status(200).json(category);
});

// ✏️ Kategori güncelle
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, isActive, language } = req.body;
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Kategorie nicht gefunden."
          : req.locale === "tr"
          ? "Kategori bulunamadı."
          : "Category not found.",
    });
    return;
  }

  category.name = name ?? category.name;
  category.description = description ?? category.description;
  category.isActive = typeof isActive === "boolean" ? isActive : category.isActive;
  category.language = language ?? category.language ?? req.locale ?? "en";

  if (name) {
    category.slug = slugify(name, { lower: true });
  }

  if (req.file) {
    category.image = `${BASE_URL}/uploads/category-images/${req.file.filename}`;
  }

  await category.save();
  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Kategorie erfolgreich aktualisiert."
        : req.locale === "tr"
        ? "Kategori başarıyla güncellendi."
        : "Category updated successfully.",
    category,
  });
});

// 🗑️ Kategori sil
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Kategorie nicht gefunden."
          : req.locale === "tr"
          ? "Kategori bulunamadı."
          : "Category not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Kategorie gelöscht."
        : req.locale === "tr"
        ? "Kategori silindi."
        : "Category deleted successfully.",
  });
});
