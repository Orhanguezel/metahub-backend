import { Request, Response } from "express";
import { asyncHandler } from "@/core/middleware/asyncHandler";
import { Test } from "./test.models";

// ➕ Create
export const createTest = asyncHandler(async (req: Request, res: Response) => {
  const created = await Test.create(req.body);
  res.status(201).json({ success: true, message: "Test created", data: created });
});

// 📝 Get All
export const getAllTest = asyncHandler(async (_req: Request, res: Response) => {
  const all = await Test.find();
  res.status(200).json({ success: true, message: "Fetched all Tests", data: all });
});

// ✏️ Update
export const updateTest = asyncHandler(async (req: Request, res: Response) => {
  const updated = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) {
    res.status(404).json({ success: false, message: "Test not found" });
    return;
  }
  res.status(200).json({ success: true, message: "Updated successfully", data: updated });
});

// 🗑️ Delete
export const deleteTest = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await Test.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: "Test not found" });
    return;
  }
  res.status(200).json({ success: true, message: "Deleted successfully" });
});