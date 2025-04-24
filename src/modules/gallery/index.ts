// src/modules/invoice/index.ts
import express from "express";
import routes from "./gallery.routes";

const router = express.Router();
router.use("/", routes);

export * from "./gallery.controller";
export { default as Gallery} from "./gallery.models";
export default router;
