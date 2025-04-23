import express from "express";
import routes from "./sparepart.routes";
const router = express.Router();
router.use("/", routes);
export * from "./sparepart.controller";
export * from "./sparepart.models";
export default router;