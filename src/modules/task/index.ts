import express from "express";
import routes from "./task.routes";

const router = express.Router();
router.use("/", routes);

export * from "./task.controller";
export * from "./task.models";

export default router;
