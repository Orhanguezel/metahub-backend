import express from "express";
import routes from "./task.routes";
import { Task } from "./task.model";
import * as TaskController from "./task.controller";

const router = express.Router();
router.use("/", routes);

export { Task, TaskController };
export * from "./task.validation";
export default routes;
