import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Skill from "./skill.models";
import { isValidObjectId } from "../../core/utils/validation";

// ✅ Tüm Skill'leri Getir
export const getAllSkills = asyncHandler(async (_req: Request, res: Response) => {
  const skills = await Skill.find().sort({ createdAt: -1 });
  res.status(200).json(skills);
});

// ✅ Yeni Skill Ekle
export const createSkill = asyncHandler(async (req: Request, res: Response) => {
  const { category, name, image } = req.body;

  if (
    !category?.tr || !category?.en || !category?.de ||
    !name?.tr || !name?.en || !name?.de ||
    !image
  ) {
    res.status(400).json({
      success: false,
      message:
        req.locale === "de"
          ? "Alle Felder sind erforderlich (inkl. Mehrsprachigkeit)."
          : req.locale === "tr"
          ? "Tüm alanlar (çok dilli) zorunludur."
          : "All fields (including multilingual) are required.",
    });
    return;
  }

  const newSkill = await Skill.create({ category, name, image });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Fähigkeit erfolgreich hinzugefügt."
        : req.locale === "tr"
        ? "Yetenek başarıyla eklendi."
        : "Skill added successfully.",
    skill: newSkill,
  });
});

// ✅ Tekil Skill Getir
export const getSkillById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid skill ID.",
    });
    return;
  }

  const skill = await Skill.findById(id);
  if (!skill) {
    res.status(404).json({
      success: false,
      message:
        req.locale === "de"
          ? "Fähigkeit nicht gefunden."
          : req.locale === "tr"
          ? "Yetenek bulunamadı."
          : "Skill not found.",
    });
    return;
  }

  res.status(200).json({ success: true, skill });
});

// ✅ Güncelle
export const updateSkill = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { category, name, image } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid skill ID." });
    return;
  }

  const skill = await Skill.findById(id);
  if (!skill) {
    res.status(404).json({
      success: false,
      message:
        req.locale === "de"
          ? "Fähigkeit nicht gefunden."
          : req.locale === "tr"
          ? "Yetenek bulunamadı."
          : "Skill not found.",
    });
    return;
  }

  skill.category = category ?? skill.category;
  skill.name = name ?? skill.name;
  skill.image = image ?? skill.image;

  await skill.save();

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Fähigkeit aktualisiert."
        : req.locale === "tr"
        ? "Yetenek güncellendi."
        : "Skill updated successfully.",
    skill,
  });
});

// ✅ Sil
export const deleteSkill = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid skill ID.",
    });
    return;
  }

  const deleted = await Skill.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404).json({
      success: false,
      message:
        req.locale === "de"
          ? "Fähigkeit nicht gefunden oder bereits gelöscht."
          : req.locale === "tr"
          ? "Yetenek bulunamadı veya zaten silinmiş."
          : "Skill not found or already deleted.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Fähigkeit gelöscht."
        : req.locale === "tr"
        ? "Yetenek silindi."
        : "Skill deleted successfully.",
  });
});
