import express from "express";
import publicRoutes from "./news.routes";
import adminRoutes from "./admin.news.routes";
import News from "./news.models";
import * as newsController from "./news.controller";
import * as adminNewsController from "./admin.news.controller";

const router = express.Router();

router.use("/", publicRoutes);
router.use("/admin", adminRoutes);

// ✅ Guard + Export (standart)
export { News, newsController, adminNewsController };
export * from "./news.models";
export * from "./news.validation";

export default router;
