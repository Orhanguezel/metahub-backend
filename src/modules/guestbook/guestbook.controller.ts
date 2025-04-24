import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Guestbook from "./guestbook.models";
import { isValidObjectId } from "../../core/utils/validation";

// 📝 Yeni yorum veya alt yorum oluştur
export const createEntry = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, parentId } = req.body;
  const lang = req.locale || "en";
  const message = req.body[`message_${lang}`];

  if (!name || !message) {
    res.status(400).json({
      message:
        lang === "de"
          ? "Name und Nachricht sind erforderlich."
          : lang === "tr"
          ? "İsim ve mesaj zorunludur."
          : "Name and message are required.",
    });
    return;
  }

  if (parentId && !isValidObjectId(parentId)) {
    res.status(400).json({ message: "Invalid parent comment ID" });
    return;
  }

  const entry = await Guestbook.create({
    name,
    email,
    message: { [lang]: message },
    parentId,
    isPublished: false,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message:
      lang === "de"
        ? "Kommentar gespeichert. Es wird nach Prüfung veröffentlicht."
        : lang === "tr"
        ? "Yorum kaydedildi. Onaylandıktan sonra yayınlanacaktır."
        : "Comment saved. It will be published after review.",
    entry,
  });
});

// 🌍 Yayınlanan yorumları getir (public)
export const getPublishedEntries = asyncHandler(async (req: Request, res: Response) => {
  const lang = req.locale || "en";

  const entries = await Guestbook.find({
    isPublished: true,
    isActive: true,
    [`message.${lang}`]: { $exists: true },
  })
    .sort({ createdAt: -1 })
    .lean();

  const topLevel = entries.filter((e) => !e.parentId);
  const replies = entries.filter((e) => e.parentId);

  const grouped = topLevel.map((entry) => ({
    ...entry,
    message: entry.message?.[lang],
    replies: replies
      .filter((r) => r.parentId?.toString() === entry._id.toString())
      .map((r) => ({
        ...r,
        message: r.message?.[lang],
      })),
  }));

  res.status(200).json(grouped);
});

// 🔐 Admin: tüm yorumları getir
export const getAllEntries = asyncHandler(async (_req: Request, res: Response) => {
  const all = await Guestbook.find().sort({ createdAt: -1 });
  res.status(200).json(all);
});

// 🔐 Admin: yayım durumunu değiştir
export const togglePublishEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid ID" });
    return;
  }

  const entry = await Guestbook.findById(id);
  if (!entry) {
    res.status(404).json({ message: "Entry not found" });
    return;
  }

  entry.isPublished = !entry.isPublished;
  await entry.save();

  res.status(200).json({
    message:
      req.locale === "de"
        ? `Eintrag wurde ${entry.isPublished ? "veröffentlicht" : "depubliziert"}.`
        : req.locale === "tr"
        ? `Yorum ${entry.isPublished ? "yayınlandı" : "yayından kaldırıldı"}.`
        : `Entry ${entry.isPublished ? "published" : "unpublished"}.`,
    entry,
  });
});

// 🔐 Admin: soft delete
export const deleteEntry = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid ID" });
    return;
  }

  const entry = await Guestbook.findById(id);
  if (!entry) {
    res.status(404).json({ message: "Entry not found" });
    return;
  }

  entry.isActive = false;
  await entry.save();

  res.status(200).json({
    message:
      req.locale === "de"
        ? "Eintrag archiviert."
        : req.locale === "tr"
        ? "Yorum arşivlendi."
        : "Entry archived successfully.",
  });
});
