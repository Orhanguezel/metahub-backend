import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Notification from "./notification.models";

// 🔔 Yeni bildirim oluştur
export const createNotification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { title, message, type, user } = req.body;

    if (!title || !message || !type) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Titel, Nachricht und Typ sind erforderlich."
            : req.locale === "tr"
            ? "Başlık, mesaj ve tür zorunludur."
            : "Title, message and type are required.",
      });
      return;
    }

    const notification = await Notification.create({
      title,
      message,
      type,
      user: user || null,
    });

    res.status(201).json({
      message:
        req.locale === "de"
          ? "Benachrichtigung erfolgreich erstellt."
          : req.locale === "tr"
          ? "Bildirim başarıyla oluşturuldu."
          : "Notification created successfully.",
      notification,
    });
  }
);

// 📋 Tüm bildirimleri getir (admin)
export const getAllNotifications = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const notifications = await Notification.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  }
);

// 🗑️ Bildirimi sil
export const deleteNotification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültige Benachrichtigungs-ID."
            : req.locale === "tr"
            ? "Geçersiz bildirim ID'si."
            : "Invalid notification ID.",
      });
      return;
    }

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Benachrichtigung nicht gefunden."
            : req.locale === "tr"
            ? "Bildirim bulunamadı."
            : "Notification not found.",
      });
      return;
    }

    res.status(200).json({
      message:
        req.locale === "de"
          ? "Benachrichtigung erfolgreich gelöscht."
          : req.locale === "tr"
          ? "Bildirim başarıyla silindi."
          : "Notification deleted successfully.",
    });
  }
);

// ✅ Tek bildirimi okundu olarak işaretle
export const markNotificationAsRead = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? "Ungültige Benachrichtigungs-ID."
            : req.locale === "tr"
            ? "Geçersiz bildirim ID'si."
            : "Invalid notification ID.",
      });
      return;
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      res.status(404).json({
        message:
          req.locale === "de"
            ? "Benachrichtigung nicht gefunden."
            : req.locale === "tr"
            ? "Bildirim bulunamadı."
            : "Notification not found.",
      });
      return;
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      message:
        req.locale === "de"
          ? "Benachrichtigung als gelesen markiert."
          : req.locale === "tr"
          ? "Bildirim okundu olarak işaretlendi."
          : "Notification marked as read.",
      notification,
    });
  }
);

// ✅ Tüm bildirimleri okundu olarak işaretle
export const markAllNotificationsAsRead = asyncHandler(
  async (_req: Request, res: Response) => {
    await Notification.updateMany({ isRead: false }, { isRead: true });

    res.json({
      message:
        _req.locale === "de"
          ? "Alle Benachrichtigungen wurden als gelesen markiert."
          : _req.locale === "tr"
          ? "Tüm bildirimler okundu olarak işaretlendi."
          : "All notifications have been marked as read.",
    });
  }
);
