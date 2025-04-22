import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ContactMessage, {
  IContactMessage,
} from "./contactMessage.models";
import { isValidObjectId } from "../../core/utils/validation";

// ✅ Public: Yeni mesaj gönder
export const sendMessage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, subject, message }: Partial<IContactMessage> =
      req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }

    const newMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message,
      language: req.locale || "en", // 🌍 çok dilli destek
    });

    res.status(201).json({
      message: "Your message has been sent.",
      newMessage,
    });
  }
);

// ✅ Admin: Tüm mesajları getir (opsiyonel dil filtresi)
export const getAllMessages = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { lang } = req.query;

    const filter: any = {};
    if (lang) filter.language = lang;

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });
    res.status(200).json(messages);
  }
);

// ✅ Admin: Tek mesajı sil
export const deleteMessage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: "Invalid message ID" });
      return;
    }

    const message = await ContactMessage.findByIdAndDelete(id);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    res.status(200).json({ message: "Message deleted successfully." });
  }
);
