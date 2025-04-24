import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Task from "./task.models";
import { isValidObjectId } from "../../core/utils/validation";

// ➕ Çok dilli görev oluştur
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const { assignedTo, apartment, period } = req.body;

  if (!assignedTo || !apartment || !period) {
    res.status(400).json({
      message:
        req.locale === "de"
          ? "Zugewiesener Benutzer, Wohnung und Zeitraum sind erforderlich."
          : req.locale === "tr"
          ? "Atanan kişi, daire ve periyot zorunludur."
          : "Assigned user, apartment and period are required.",
    });
    return;
  }

  const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
  const description: any = {};

  for (const lang of langs) {
    const desc = req.body[`description_${lang}`];
    if (!desc) {
      res.status(400).json({
        message:
          req.locale === "de"
            ? `Beschreibung (${lang}) fehlt.`
            : req.locale === "tr"
            ? `Açıklama (${lang}) eksik.`
            : `Description (${lang}) is missing.`,
      });
      return;
    }
    description[lang] = desc;
  }

  const task = await Task.create({
    description,
    assignedTo,
    apartment,
    period,
  });

  res.status(201).json({
    success: true,
    message:
      req.locale === "de"
        ? "Aufgabe erfolgreich erstellt."
        : req.locale === "tr"
        ? "Görev başarıyla oluşturuldu."
        : "Task created successfully.",
    task,
  });
});

// 📋 Tüm görevleri getir (opsiyonel dil filtresi)
export const getAllTasks = asyncHandler(async (req: Request, res: Response) => {
  const tasks = await Task.find()
    .populate("assignedTo", "name email")
    .populate("apartment", "name address")
    .sort({ createdAt: -1 });

  res.status(200).json(tasks);
});


// 🔍 Tek görev getir
export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findById(req.params.id)
    .populate("assignedTo", "name email")
    .populate("apartment", "name address");

  if (!task) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Aufgabe nicht gefunden."
          : req.locale === "tr"
          ? "Görev bulunamadı."
          : "Task not found.",
    });
    return;
  }

  res.status(200).json(task);
});

// ✏️ Güncelle
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Aufgabe nicht gefunden."
          : req.locale === "tr"
          ? "Görev bulunamadı."
          : "Task not found.",
    });
    return;
  }

  const { description, assignedTo, apartment, status, period } = req.body;

  task.description = description ?? task.description;
  task.assignedTo = assignedTo ?? task.assignedTo;
  task.apartment = apartment ?? task.apartment;
  task.status = status ?? task.status;
  task.period = period ?? task.period;

  await task.save();

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Aufgabe aktualisiert."
        : req.locale === "tr"
        ? "Görev güncellendi."
        : "Task updated successfully.",
    task,
  });
});

// 🗑️ Sil
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findByIdAndDelete(req.params.id);

  if (!task) {
    res.status(404).json({
      message:
        req.locale === "de"
          ? "Aufgabe nicht gefunden."
          : req.locale === "tr"
          ? "Görev bulunamadı."
          : "Task not found.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message:
      req.locale === "de"
        ? "Aufgabe gelöscht."
        : req.locale === "tr"
        ? "Görev silindi."
        : "Task deleted successfully.",
  });
});



