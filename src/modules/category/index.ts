import express from "express";
import routes from "./category.routes";
const router = express.Router();
router.use("/", routes);
export * from "./category.controller";
export * from "./category.models";
export default router;