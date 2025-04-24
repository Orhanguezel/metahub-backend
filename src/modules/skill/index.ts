import express from "express";
import skillRoutes from "./skill.routes";
import Skill from "./skill.models";
import * as skillController from "./skill.controller";

const router = express.Router();
router.use("/", skillRoutes);

export { Skill, skillController };
export default router;
