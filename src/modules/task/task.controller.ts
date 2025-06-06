import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Task } from "@/modules/task";
import { isValidObjectId } from "@/core/utils/validation";

// ✅ Create Task
export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, assignedTo, apartment, period, priority, dueDate, repeat, notes } = req.body;

  if (!assignedTo || !apartment || !period) {
    res.status(400).json({
      success: false,
      message: "assignedTo, apartment and period are required.",
    });
    return 
  }

  const task = await Task.create({
    title,
    description,
    assignedTo,
    assignedBy: req.user?._id,
    apartment,
    period,
    priority,
    dueDate,
    repeat,
    notes,
    files: req.body.files || [],
  });

  res.status(201).json({
    success: true,
    message: "Task created successfully.",
    data: task,
  });
});

// ✅ Get All Tasks (admin/moderator only)
export const getAllTasks = asyncHandler(async (_req: Request, res: Response) => {
  const tasks = await Task.find()
    .populate("assignedTo", "name email")
    .populate("assignedBy", "name email")
    .populate("apartment", "name address")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "Tasks fetched successfully.",
    data: tasks,
  });
});

// ✅ Get My Tasks (kullanıcının kendi atandığı görevler)
export const getMyTasks = asyncHandler(async (req: Request, res: Response) => {
  const tasks = await Task.find({ assignedTo: req.user?._id })
    .populate("apartment", "name address")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "My tasks fetched successfully.",
    data: tasks,
  });
});

// ✅ Get Single Task
export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid task ID." });
    return 
  }

  const task = await Task.findById(id)
    .populate("assignedTo", "name email")
    .populate("assignedBy", "name email")
    .populate("apartment", "name address");

  if (!task) {
    res.status(404).json({ success: false, message: "Task not found." });
    return 
  }

  res.status(200).json({
    success: true,
    message: "Task fetched successfully.",
    data: task,
  });
});

// ✅ Update Task (admin/moderator)
export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid task ID." });
    return 
  }

  const task = await Task.findById(id);
  if (!task) {
     res.status(404).json({ success: false, message: "Task not found." });
     return
  }

  const {
    title,
    description,
    assignedTo,
    apartment,
    period,
    priority,
    repeat,
    dueDate,
    status,
    notes,
    isActive,
    files,
  } = req.body;

  if (title) task.title = title;
  if (description) task.description = description;
  if (assignedTo) task.assignedTo = assignedTo;
  if (apartment) task.apartment = apartment;
  if (period) task.period = period;
  if (priority) task.priority = priority;
  if (typeof repeat === "boolean") task.repeat = repeat;
  if (dueDate) task.dueDate = dueDate;
  if (status) task.status = status;
  if (notes !== undefined) task.notes = notes;
  if (typeof isActive === "boolean") task.isActive = isActive;
  if (Array.isArray(files)) task.files = files;

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
     return
  }

  const task = await Task.findByIdAndDelete(id);
  if (!task) {
     res.status(404).json({ success: false, message: "Task not found." });
     return
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully.",
  });
});

// ✅ Update Task Status (kullanıcı kendi görevine)
export const updateMyTaskStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "in-progress", "paused", "completed", "cancelled"].includes(status)) {
     res.status(400).json({ success: false, message: "Invalid status value." });
     return
  }

  const task = await Task.findOne({ _id: id, assignedTo: req.user?._id });
  if (!task) {
     res.status(404).json({ success: false, message: "Task not found or not assigned to you." });
     return
  }

  task.status = status;
  if (status === "completed") task.completedAt = new Date();

  await task.save();

  res.status(200).json({
    success: true,
    message: "Task status updated successfully.",
    data: task,
  });
});
