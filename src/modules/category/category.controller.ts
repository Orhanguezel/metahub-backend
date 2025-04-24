import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";
import Category from "./category.models";
import { BASE_URL, UPLOAD_BASE_PATH } from "../../core/middleware/uploadMiddleware";
import { isValidObjectId } from "../../core/utils/validation";

// ✅ Kategori oluştur (tek dil)
export const createCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    name,
    description,
    isActive,
    label
  } = req.body;

  const files = req.files as Express.Multer.File[];
  const previewImage = files?.[0]?.filename || null;
  const imageUrl = previewImage
    ? `${BASE_URL}/${UPLOAD_BASE_PATH}/category-images/${previewImage}`
    : "defaults/category.png";

  if (!name || !label?.tr || !label?.en || !label?.de) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Bitte alle Pflichtfelder ausfüllen."
          : req.locale === "tr"
          ? "Lütfen tüm zorunlu alanları doldurun."
          : "Please fill all required fields."
    });
    return;
  }

  const slug = slugify(name, { lower: true });
  const existing = await Category.findOne({ slug });
  if (existing) {
    res.status(409).json({
      message:
        req.locale === "de"
          ? "Kategorie existiert bereits."
          : req.locale === "tr"
          ? "Bu kategori zaten mevcut."
          : "Category already exists."
    });
    return;
  }

  const category = await Category.create({
    name,
    slug,
    description,
    isActive: typeof isActive === "boolean" ? isActive : true,
    image: imageUrl,
    label
  });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Kategorie erfolgreich erstellt."
        : req.locale === "tr"
        ? "Kategori başarıyla oluşturuldu."
        : "Category created successfully.",
    category
  });
});

// ✅ Tüm kategorileri getir
export const getAllCategories = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { isActive } = req.query;

  const filter: any = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const categories = await Category.find(filter).sort({ name: 1 });
  res.status(200).json(categories);
});

// ✅ Kategori getir (ID ile)
export const getCategoryById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Ungültige Kategorie-ID."
          : req.locale === "tr"
          ? "Geçersiz kategori ID'si."
          : "Invalid category ID."
    });
    return;
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Kategorie nicht gefunden."
          : req.locale === "tr"
          ? "Kategori bulunamadı."
          : "Category not found."
    });
    return;
  }

  res.status(200).json(category);
});

// ✅ Kategori güncelle
export const updateCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, description, isActive, label } = req.body;

  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Ungültige Kategorie-ID."
          : req.locale === "tr"
          ? "Geçersiz kategori ID'si."
          : "Invalid category ID."
    });
    return;
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Kategorie nicht gefunden."
          : req.locale === "tr"
          ? "Kategori bulunamadı."
          : "Category not found."
    });
    return;
  }

  category.name = name ?? category.name;
  category.description = description ?? category.description;
  category.isActive = typeof isActive === "boolean" ? isActive : category.isActive;
  category.slug = name ? slugify(name, { lower: true }) : category.slug;

  if (label) category.label = label;

  const file = req.file as Express.Multer.File;
  if (file) {
    category.image = `${BASE_URL}/${UPLOAD_BASE_PATH}/category-images/${file.filename}`;
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
    category
  });
});

// ✅ Kategori sil
export const deleteCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Ungültige Kategorie-ID."
          : req.locale === "tr"
          ? "Geçersiz kategori ID'si."
          : "Invalid category ID."
    });
    return;
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Kategorie nicht gefunden."
          : req.locale === "tr"
          ? "Kategori bulunamadı."
          : "Category not found."
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
        : "Category deleted successfully."
  });
});
