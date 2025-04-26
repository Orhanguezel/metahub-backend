// src/modules/news/index.ts
import express from "express";
import publicRoutes from "./news.routes";
import adminRoutes from "./admin.news.routes";
import News from "./news.models";

const router = express.Router();

router.use("/", publicRoutes);    
router.use("/admin", adminRoutes);    

export * from "./news.controller";
export * from "./admin.news.controller";
export { News };
export * from "./news.models";

export default router;
