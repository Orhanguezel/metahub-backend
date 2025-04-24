import express from "express";
import socialRoutes from "./social.routes";
import SocialMedia from "./social.models";
import * as socialController from "./social.controller";

const router = express.Router();
router.use("/", socialRoutes);

export { SocialMedia, socialController };
export default router;
