// src/controllers/task.controller.ts
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Task from "./task.models";
import { isValidObjectId } from "../../core/utils/validation";

// ➕ Çok dilli görev oluştur
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const { assignedTo, apartment, period } = req.body;
  const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
  const createdTasks = [];

  if (!assignedTo || !apartment || !period) {
    res.status(400).json({ message: "Required fields are missing." });
    return;
  }

  for (const lang of langs) {
    const description = req.body[`description_${lang}`];
    if (!description) continue;

    const task = await Task.create({
      description,
      assignedTo,
      apartment,
      period,
      language: lang,
    });

    createdTasks.push(task);
  }

  if (createdTasks.length === 0) {
    res.status(400).json({ message: "No valid language data provided." });
    return;
  }

  res.status(201).json({
    success: true,
    message: "Tasks created successfully.",
    tasks: createdTasks,
  });
});

// 📋 Tüm görevleri getir (opsiyonel dil filtresi)
export const getAllTasks = asyncHandler(async (req: Request, res: Response) => {
  const { lang } = req.query;
  const filter: any = {};
  if (lang) filter.language = lang;

  const tasks = await Task.find(filter)
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
    res.status(404).json({ message: "Task not found." });
    return;
  }

  res.status(200).json(task);
});

// ✏️ Güncelle
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { description, assignedTo, apartment, status, period, language } = req.body;
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404).json({ message: "Task not found." });
    return;
  }

  task.description = description ?? task.description;
  task.assignedTo = assignedTo ?? task.assignedTo;
  task.apartment = apartment ?? task.apartment;
  task.status = status ?? task.status;
  task.period = period ?? task.period;
  task.language = language ?? task.language;

  await task.save();

  res.status(200).json({ success: true, message: "Task updated.", task });
});

// 🗑️ Sil
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findByIdAndDelete(req.params.id);

  if (!task) {
    res.status(404).json({ message: "Task not found." });
    return;
  }

  res.status(200).json({ success: true, message: "Task deleted." });
});
