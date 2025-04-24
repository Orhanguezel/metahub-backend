import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import ContactMessage from "./contact.models";
import { isValidObjectId } from "../../core/utils/validation";

// ✅ Public: Yeni mesaj gönder
export const sendMessage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Alle Felder sind erforderlich."
            : req.locale === "tr"
            ? "Tüm alanlar zorunludur."
            : "All fields are required.",
      });
      return;
    }

    const newMessage = await ContactMessage.create({
      name,
      email,
      label: {
        subject: {
          tr: subject,
          en: subject,
          de: subject,
        },
        message: {
          tr: message,
          en: message,
          de: message,
        },
      },
      isRead: false,
      isArchived: false,
    });

    res.status(201).json({
      success: true,
      message:
        req.locale === "de"
          ? "Ihre Nachricht wurde gesendet."
          : req.locale === "tr"
          ? "Mesajınız gönderildi."
          : "Your message has been sent.",
      messageData: newMessage,
    });
  }
);

// ✅ Admin: Tüm mesajları getir (opsiyonel dil filtresi)
export const getAllMessages = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { lang } = req.query;
    const filter: any = {};
    if (lang) filter[`label.subject.${lang}`] = { $exists: true };

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });
    res.status(200).json(messages);
  }
);

// ✅ Admin: Tek mesajı sil
export const deleteMessage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültige Nachrichten-ID."
            : req.locale === "tr"
            ? "Geçersiz mesaj ID'si."
            : "Invalid message ID.",
      });
      return;
    }

    const message = await ContactMessage.findByIdAndDelete(id);
    if (!message) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Nachricht nicht gefunden."
            : req.locale === "tr"
            ? "Mesaj bulunamadı."
            : "Message not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        req.locale === "de"
          ? "Nachricht gelöscht."
          : req.locale === "tr"
          ? "Mesaj silindi."
          : "Message deleted successfully.",
    });
  }
);
