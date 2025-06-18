import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
//import { ContactMessage } from "@/modules/contact";
import { isValidObjectId } from "@/core/utils/validation";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";

// ✅ Public: Send new contact message
export const sendMessage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, subject, message } = req.body;

      const { ContactMessage } = await getTenantModels(req);
      const newMessage = await ContactMessage.create({
        name,
        email,
        tenant: req.tenant, // 🟢 Eklendi
        label: {
          subject: { tr: subject, en: subject, de: subject },
          message: { tr: message, en: message, de: message },
        },
        isRead: false,
        isArchived: false,
      });

      res.status(201).json({
        success: true,
        message: "Your message has been sent.",
        data: newMessage,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Get all messages
export const getAllMessages = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ContactMessage } = await getTenantModels(req);
      const messages = await ContactMessage.find({ tenant: req.tenant }).sort({
        createdAt: -1,
      });
      res.status(200).json({
        success: true,
        message: "Messages fetched successfully.",
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Admin: Delete single message
export const deleteMessage = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { ContactMessage } = await getTenantModels(req);
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid message ID.",
        });
        return;
      }

      const message = await ContactMessage.deleteOne({
        _id: id,
        tenant: req.tenant,
      });
      if (!message) {
        res.status(404).json({
          success: false,
          message: "Message not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Message deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);
