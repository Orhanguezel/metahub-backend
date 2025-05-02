import express from "express";
import routes from "./task.routes";
import Task, { ITask } from "./task.models";
import * as taskController from "./task.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Guard + Export (standart yapı)
export { Task, ITask, taskController };
export * from "./task.validation";

export default router;
