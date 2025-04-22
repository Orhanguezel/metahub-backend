import express from "express";
import {
  getAllSkills,
  createSkill,
  getSkillById,
  updateSkill,
  deleteSkill,
} from "./skill.controller";

const router = express.Router();

router.route("/").get(getAllSkills).post(createSkill);
router.route("/:id").get(getSkillById).put(updateSkill).delete(deleteSkill);

export default router;
