import { Types } from "mongoose";

export interface ITask {
  title: {
    tr?: string;
    en?: string;
    de?: string;
  };
  tenant: string; // Optional tenant field for multi-tenancy
  description: {
    tr?: string;
    en?: string;
    de?: string;
  };
  assignedTo: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  apartment: Types.ObjectId;
  status: "pending" | "in-progress" | "paused" | "completed" | "cancelled";
  period: "one-time" | "daily" | "weekly" | "bi-weekly" | "monthly";
  repeat: boolean;
  dueDate?: Date;
  completedAt?: Date;
  priority: "low" | "normal" | "high" | "critical";
  notes?: string;
  files?: string[]; // cloudinary ya da local path
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
