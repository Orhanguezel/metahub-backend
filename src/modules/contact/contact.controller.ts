import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { ContactMessage } from "@/modules/contact";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Public: Send new contact message
export const sendMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, subject, message } = req.body;

    const newMessage = await ContactMessage.create({
      name,
      email,
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
});

// ✅ Admin: Get all messages
export const getAllMessages = asyncHandler(async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Messages fetched successfully.",
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

// ✅ Admin: Delete single message
export const deleteMessage = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid message ID.",
      });
      return;
    }

    const message = await ContactMessage.findByIdAndDelete(id);
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
});
