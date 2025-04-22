import express from "express";
import { getAllSocialLinks, createSocialLink } from "./social.controller";

const router = express.Router();

router.route("/").get(getAllSocialLinks).post(createSocialLink);

export default router;
