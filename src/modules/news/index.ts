import express from "express";
import publicRoutes from "./public.news.routes";
import adminRoutes from "./admin.news.routes";
import { News } from "./news.models";
import * as publicNewsController from "./public.news.controller";
import * as adminNewsController from "./admin.news.controller";
import * as newsValidation from "./news.validation";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);


// 🌟 
export { News, publicNewsController, adminNewsController, newsValidation };
export default router;
