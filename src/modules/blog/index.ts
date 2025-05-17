// src/modules/blog/index.ts

import express from "express";
import adminRoutes from "./admin.blog.routes";
import publicRoutes from "./public.blog.routes";
import Blog, { IBlog } from "./blog.models";
import * as adminController from "./admin.blog.controller";
import * as publicController from "./public.blog.controller";
import * as validation from "./blog.validation";

const router = express.Router();

// 🔐 Admin Routes
router.use("/admin", adminRoutes);

// 🌍 Public Routes
router.use("/", publicRoutes);



// ✅ Exports (standardized)
export {
  Blog,
  IBlog,
  adminController,
  publicController,
  validation,
};

export default router;
