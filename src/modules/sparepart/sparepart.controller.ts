import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import SparePart from "./sparepart.models";

// 🔹 Yeni yedek parça oluştur
export const createSparePart = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      slug,
      code,
      description,
      category,
      manufacturer,
      specifications = {},
      stock = 0,
      price,
      tags = [],
      language = req.locale || "en",
      isPublished = false,
    } = req.body;

    if (!name || !slug || !code || !price) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Pflichtfelder fehlen."
            : req.locale === "tr"
            ? "Gerekli alanlar eksik."
            : "Required fields are missing",
      });
      return;
    }

    const imageUrl = req.file
      ? `${process.env.BASE_URL}/uploads/spareparts/${req.file.filename}`
      : `${process.env.BASE_URL}/uploads/spareparts/default.png`;

    const sparePart = await SparePart.create({
      name,
      slug,
      code,
      description,
      image: imageUrl,
      category,
      manufacturer,
      specifications,
      stock,
      price,
      tags: typeof tags === "string" ? JSON.parse(tags) : tags,
      language,
      isPublished,
    });

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "Ersatzteil erfolgreich erstellt."
          : req.locale === "tr"
          ? "Yedek parça başarıyla oluşturuldu."
          : "Spare part created successfully",
      sparePart,
    });
  }
);

// 🔹 Tüm yedek parçaları getir (isteğe bağlı dil filtresi)
export const getAllSpareParts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { language } = req.query;

    const filter: any = {};
    if (language) filter.language = language;
    else if (req.locale) filter.language = req.locale;

    const parts = await SparePart.find(filter).sort({ createdAt: -1 });
    res.status(200).json(parts);
  }
);

// 🔹 Slug ile yedek parça getir
export const getSparePartBySlug = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const part = await SparePart.findOne({ slug: req.params.slug });
    if (!part) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Ersatzteil nicht gefunden."
            : req.locale === "tr"
            ? "Yedek parça bulunamadı."
            : "Spare part not found",
      });
      return;
    }
    res.status(200).json(part);
  }
);

// 🔹 ID ile yedek parça getir
export const getSparePartById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const part = await SparePart.findById(req.params.id);
    if (!part) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Ersatzteil nicht gefunden."
            : req.locale === "tr"
            ? "Yedek parça bulunamadı."
            : "Spare part not found",
      });
      return;
    }
    res.status(200).json(part);
  }
);

// 🔹 Güncelleme
export const updateSparePart = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const part = await SparePart.findById(req.params.id);
    if (!part) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Ersatzteil nicht gefunden."
            : req.locale === "tr"
            ? "Yedek parça bulunamadı."
            : "Spare part not found",
      });
      return;
    }

    const {
      name,
      slug,
      code,
      description,
      category,
      manufacturer,
      specifications,
      stock,
      price,
      tags,
      language,
      isPublished,
    } = req.body;

    part.name = name ?? part.name;
    part.slug = slug ?? part.slug;
    part.code = code ?? part.code;
    part.description = description ?? part.description;
    part.category = category ?? part.category;
    part.manufacturer = manufacturer ?? part.manufacturer;
    part.specifications = specifications ?? part.specifications;
    part.stock = stock ?? part.stock;
    part.price = price ?? part.price;
    part.language = language ?? part.language;
    part.isPublished =
      typeof isPublished === "boolean" ? isPublished : part.isPublished;
    if (tags) part.tags = typeof tags === "string" ? JSON.parse(tags) : tags;

    if (req.files && Array.isArray(req.files)) {
      const newImages = (req.files as Express.Multer.File[]).map(
        (file) => `${process.env.BASE_URL}/uploads/spareparts/${file.filename}`
      );
      part.image = [...(part.image || []), ...newImages]; // önceki görseller korunur
    }

    await part.save();

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Ersatzteil aktualisiert."
          : req.locale === "tr"
          ? "Yedek parça güncellendi."
          : "Spare part updated successfully",
      sparePart: part,
    });
  }
);

// 🔹 Silme
export const deleteSparePart = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const deleted = await SparePart.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Ersatzteil nicht gefunden."
            : req.locale === "tr"
            ? "Yedek parça bulunamadı."
            : "Spare part not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Ersatzteil gelöscht."
          : req.locale === "tr"
          ? "Yedek parça silindi."
          : "Spare part deleted successfully",
    });
  }
);
