import express from "express";
import routes from "./library.routes";
const router = express.Router();
router.use("/", routes);
export * from "./library.controller";
export * from "./library.models";
export default router;