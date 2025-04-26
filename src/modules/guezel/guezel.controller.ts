import { Request, Response } from "express";
import { asyncHandler } from "@/core/middleware/asyncHandler";
import { Guezel } from "./guezel.models";

// ➕ Create
export const createGuezel = asyncHandler(async (req: Request, res: Response) => {
  const created = await Guezel.create(req.body);
  res.status(201).json({ success: true, message: "Guezel created", data: created });
});

// 📝 Get All
export const getAllGuezel = asyncHandler(async (_req: Request, res: Response) => {
  const all = await Guezel.find();
  res.status(200).json({ success: true, message: "Fetched all Guezels", data: all });
});

// ✏️ Update
export const updateGuezel = asyncHandler(async (req: Request, res: Response) => {
  const updated = await Guezel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) {
    res.status(404).json({ success: false, message: "Guezel not found" });
    return;
  }
  res.status(200).json({ success: true, message: "Updated successfully", data: updated });
});

// 🗑️ Delete
export const deleteGuezel = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await Guezel.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: "Guezel not found" });
    return;
  }
  res.status(200).json({ success: true, message: "Deleted successfully" });
});