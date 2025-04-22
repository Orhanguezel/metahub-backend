import express from "express";
import { getAllExperiences, createExperience } from "./experience.controller";

const router = express.Router();

router.route("/").get(getAllExperiences).post(createExperience);

export default router;
