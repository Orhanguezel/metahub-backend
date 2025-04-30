import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "mongoose";
import crypto from "crypto";
import { Apikey } from "./apikey.models";

// ➕ Create API Key
export const createApikey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name } = req.body;

  const key = crypto.randomBytes(32).toString("hex");
  const newKey = await Apikey.create({ name, key });

  res.status(201).json({
    success: true,
    message: "API key created successfully.",
    data: newKey,
  });

  return;
});


// 📝 Get All
export const getAllApikey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const keys = await Apikey.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "API keys fetched successfully.",
    data: keys,
  });

  return;
});

// ✏️ Update
export const updateApikey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid API key ID." });
    return;
  }

  const key = await Apikey.findById(id);
  if (!key) {
    res.status(404).json({ success: false, message: "API key not found." });
    return;
  }

  key.name = name || key.name;
  await key.save();

  res.status(200).json({
    success: true,
    message: "API key updated successfully.",
    data: key,
  });

  return;
});

// 🗑️ Delete
export const deleteApikey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid API key ID." });
    return;
  }

  const key = await Apikey.findByIdAndDelete(id);
  if (!key) {
    res.status(404).json({ success: false, message: "API key not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "API key deleted successfully.",
  });

  return;
});
