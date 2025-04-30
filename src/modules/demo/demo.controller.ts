import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "mongoose";
import { Demo } from "./demo.models";

// ➕ Create
export const createDemo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  const created = await Demo.create({ name });

  res.status(201).json({
    success: true,
    message: "Demo created successfully.",
    data: created,
  });

  return;
});


// 📝 Get All
export const getAllDemo = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const demos = await Demo.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Demo list fetched successfully.",
    data: demos,
  });

  return;
});

// ✏️ Update
export const updateDemo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid ID." });
    return;
  }

  const demo = await Demo.findByIdAndUpdate(id, { name }, { new: true });

  if (!demo) {
    res.status(404).json({ success: false, message: "Demo not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Demo updated successfully.",
    data: demo,
  });

  return;
});

// 🗑️ Delete
export const deleteDemo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid ID." });
    return;
  }

  const demo = await Demo.findByIdAndDelete(id);

  if (!demo) {
    res.status(404).json({ success: false, message: "Demo not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Demo deleted successfully.",
  });

  return;
});

// ✅ API Key ile erişilen ping
export const pingDemo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: "API Key is valid.",
    });
  });
