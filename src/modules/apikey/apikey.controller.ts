import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { isValidObjectId } from "mongoose";
import crypto from "crypto";
//import { Apikey } from "@/modules/apikey";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ➕ Create API Key
export const createApikey = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.body;

      const key = crypto.randomBytes(32).toString("hex");
      const { Apikey } = await getTenantModels(req);
      const newKey = await Apikey.create({ name, key, tenant: req.tenant });

      res.status(201).json({
        success: true,
        message: "API key created successfully.",
        data: newKey,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// 📝 Get All
export const getAllApikey = asyncHandler(
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { Apikey } = await getTenantModels(_req);
      const keys = await Apikey.find({ tenant: _req.tenant }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        message: "API keys fetched successfully.",
        data: keys,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);

// ✏️ Update
export const updateApikey = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const { Apikey } = await getTenantModels(req);

      if (!isValidObjectId(id)) {
        res
          .status(400)
          .json({ success: false, message: "Invalid API key ID." });
        return;
      }

      const key = await Apikey.findOne({ _id: id, tenant: req.tenant });
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
    } catch (error) {
      next(error);
    }
  }
);

// 🗑️ Delete
export const deleteApikey = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { Apikey } = await getTenantModels(req);

      if (!isValidObjectId(id)) {
        res
          .status(400)
          .json({ success: false, message: "Invalid API key ID." });
        return;
      }

      const key = await Apikey.deleteOne({ _id: id, tenant: req.tenant });
      if (!key) {
        res.status(404).json({ success: false, message: "API key not found." });
        return;
      }

      res.status(200).json({
        success: true,
        message: "API key deleted successfully.",
      });
      return;
    } catch (error) {
      next(error);
    }
  }
);
