import express from "express";
import routes from "./references.routes";
const router = express.Router();
router.use("/", routes);
export * from "./references.controller";
export * from "./references.models";
export default router;