// ✅ Guard + Model Type

import express from "express";
import routes from "./articles.routes";
import { Article, IArticle } from "./articles.models";
import * as articlesController from "./articles.controller";

const router = express.Router();
router.use("/", routes);

export {
  Article,
  IArticle,
  articlesController
};

export * from "./articles.validation";
export default router;
