import express from "express";
import routes from "./guezel.routes";

const router = express.Router();
router.use("/", routes);

export * from "./guezel.controller";
export * from "./guezel.models";
export default router;