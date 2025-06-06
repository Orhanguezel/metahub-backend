import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Skill } from "@/modules/skill";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Get all skills
export const getAllSkills = asyncHandler(async (_req: Request, res: Response) => {
  const skills = await Skill.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: "All skills fetched successfully.",
    data: skills,
  });
});

// ✅ Create new skill
export const createSkill = asyncHandler(async (req: Request, res: Response) => {
  const { category, name, image } = req.body;

  const newSkill = await Skill.create({ category, name, image });

  res.status(201).json({
    success: true,
    message: "Skill added successfully.",
    data: newSkill,
  });
});

// ✅ Get single skill
export const getSkillById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const skill = await Skill.findById(id);
  if (!skill) {
    res.status(404);
    throw new Error("Skill not found.");
  }

  res.status(200).json({
    success: true,
    message: "Skill fetched successfully.",
    data: skill,
  });
});

// ✅ Update skill
export const updateSkill = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const skill = await Skill.findById(id);
  if (!skill) {
    res.status(404);
    throw new Error("Skill not found.");
  }

  skill.category = updates.category ?? skill.category;
  skill.name = updates.name ?? skill.name;
  skill.image = updates.image ?? skill.image;

  await skill.save();

  res.status(200).json({
    success: true,
    message: "Skill updated successfully.",
    data: skill,
  });
});

// ✅ Delete skill
export const deleteSkill = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deleted = await Skill.findByIdAndDelete(id);
  if (!deleted) {
    res.status(404);
    throw new Error("Skill not found or already deleted.");
  }

  res.status(200).json({
    success: true,
    message: "Skill deleted successfully.",
  });
});
