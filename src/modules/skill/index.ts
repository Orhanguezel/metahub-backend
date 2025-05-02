import express from "express";
import skillRoutes from "./skill.routes";
import Skill, { ISkill } from "./skill.models";
import * as skillController from "./skill.controller";

const router = express.Router();
router.use("/", skillRoutes);

export { Skill, ISkill, skillController };
export * from "./skill.validation";
export default router;
