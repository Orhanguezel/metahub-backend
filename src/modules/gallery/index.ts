import express from "express";
import routes from "./gallery.routes";

const router = express.Router();
router.use("/", routes);

export * from "./gallery.controller";
export * from "./gallery.models";

export default router;
