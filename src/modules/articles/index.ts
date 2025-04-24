// src/modules/articles/index.ts
import express from "express";
import routes from "./articles.routes";
import Article from "./articles.models";

const router = express.Router();
router.use("/", routes);

export * from "./articles.controller";
export { Article };
export default router;
