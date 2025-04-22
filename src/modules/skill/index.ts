import express from "express";
import routes from "./skill.routes";

const router = express.Router();
router.use("/", routes);

export * from "./skill.controller";
export * from "./skill.models";

export default router;
