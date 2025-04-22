// src/controllers/guestbook.controller.ts

import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Guestbook from "./guestbook.models";
import { isValidObjectId } from "../../core/utils/validation";

// 🔸 Yeni yorum veya alt yorum ekle
export const createEntry = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, message, parentId } = req.body;

  if (!name || !message) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Name und Nachricht sind erforderlich."
          : req.locale === "tr"
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
    message,
    parentId,
    language: req.locale || "en",
    isPublished: false,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Kommentar gespeichert. Es wird nach Prüfung veröffentlicht."
        : req.locale === "tr"
        ? "Yorum kaydedildi. Onaylandıktan sonra yayınlanacaktır."
        : "Comment saved. It will be published after review.",
    entry,
  });
});

// 🔸 Yayınlanan yorumları getir
export const getPublishedEntries = asyncHandler(async (req: Request, res: Response) => {
  const lang = req.locale || "en";
  const entries = await Guestbook.find({
    isPublished: true,
    isActive: true,
    language: lang,
  })
    .sort({ createdAt: -1 })
    .lean();

  // Alt yorumları grupla
  const topLevel = entries.filter((e) => !e.parentId);
  const replies = entries.filter((e) => e.parentId);

  const grouped = topLevel.map((entry) => ({
    ...entry,
    replies: replies.filter((r) => r.parentId?.toString() === entry._id.toString()),
  }));

  res.status(200).json(grouped);
});

// 🔸 Admin: tüm yorumları getir
export const getAllEntries = asyncHandler(async (_req: Request, res: Response) => {
  const all = await Guestbook.find().sort({ createdAt: -1 });
  res.status(200).json(all);
});

// 🔸 Admin: yayın durumunu değiştir
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
    message: `Entry ${entry.isPublished ? "published" : "unpublished"}`,
    entry,
  });
});

// 🔸 Admin: soft delete
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

  res.status(200).json({ message: "Entry archived successfully" });
});
