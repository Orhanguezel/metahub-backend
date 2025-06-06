import express from "express";
import socialRoutes from "./social.routes";
import SocialMedia, { ISocialMedia } from "./social.models";
import * as socialController from "./social.controller";

const router = express.Router();
router.use("/", socialRoutes);

export { SocialMedia, ISocialMedia, socialController };
export * from "./social.validation";
export default router;
