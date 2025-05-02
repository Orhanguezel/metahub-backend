// ✅ Module Export (standardized with Guard + Model Typing)
import express from "express";
import routes from "./blog.routes";
import { Blog, IBlog } from "./blog.models";
import * as blogController from "./blog.controller";
import * as blogValidation from "./blog.validation";

const router = express.Router();
router.use("/", routes);

export {
  Blog,
  IBlog,
  blogController,
  blogValidation,
};

export default router;
