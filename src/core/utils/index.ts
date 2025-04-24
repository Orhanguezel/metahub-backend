import express from "express";
import routes from "@/modules/admin/admin.routes";

const router = express.Router();
router.use("/", routes);

export * from "@/modules/admin/admin.controller";
export * from "@/modules/admin/admin.models";

export default router;