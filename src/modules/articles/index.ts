import express from "express";
import routes from "./articles.routes";
const router = express.Router();
router.use("/", routes);
export * from "./articles.controller";
export * from "./articles.models";
export default router;