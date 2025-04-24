import express from "express";
import taskRoutes from "./task.routes";
import Task from "./task.models";
import * as taskController from "./task.controller";

const router = express.Router();
router.use("/", taskRoutes);

export { Task, taskController };
export default router;
