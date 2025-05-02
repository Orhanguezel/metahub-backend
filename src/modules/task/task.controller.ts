import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Task } from "@/modules/task";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Task (multilingual)
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const { assignedTo, apartment, period } = req.body;

  if (!assignedTo || !apartment || !period) {
    res.status(400).json({
      success: false,
      message: "Assigned user, apartment, and period are required.",
    });
    return;
  }

  const langs: ("tr" | "en" | "de")[] = ["tr", "en", "de"];
  const description: Record<string, string> = {};

  for (const lang of langs) {
    const desc = req.body[`description_${lang}`];
    if (!desc) {
      res.status(400).json({
        success: false,
        message: `Description (${lang}) is required.`,
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
    message: "Task created successfully.",
    data: task,
  });
});

// ✅ Get All Tasks
export const getAllTasks = asyncHandler(async (_req: Request, res: Response) => {
  const tasks = await Task.find()
    .populate("assignedTo", "name email")
    .populate("apartment", "name address")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Tasks fetched successfully.",
    data: tasks,
  });
});

// ✅ Get Single Task
export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid task ID." });
    return;
  }

  const task = await Task.findById(id)
    .populate("assignedTo", "name email")
    .populate("apartment", "name address");

  if (!task) {
    res.status(404).json({ success: false, message: "Task not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Task fetched successfully.",
    data: task,
  });
});

// ✅ Update Task
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid task ID." });
    return;
  }

  const task = await Task.findById(id);
  if (!task) {
    res.status(404).json({ success: false, message: "Task not found." });
    return;
  }

  const { description, description_tr, description_en, description_de, assignedTo, apartment, status, period } = req.body;

  // Destek: Hem tüm description obje olarak hem tek tek girilenler desteklenir.
  if (description) {
    task.description = description;
  } else {
    task.description.tr = description_tr ?? task.description.tr;
    task.description.en = description_en ?? task.description.en;
    task.description.de = description_de ?? task.description.de;
  }

  task.assignedTo = assignedTo ?? task.assignedTo;
  task.apartment = apartment ?? task.apartment;
  task.status = status ?? task.status;
  task.period = period ?? task.period;

  await task.save();

  res.status(200).json({
    success: true,
    message: "Task updated successfully.",
    data: task,
  });
});

// ✅ Delete Task
export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid task ID." });
    return;
  }

  const task = await Task.findByIdAndDelete(id);

  if (!task) {
    res.status(404).json({ success: false, message: "Task not found." });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully.",
  });
});
