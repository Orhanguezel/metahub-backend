import express from "express";
import routes from "./admin.routes";

const router = express.Router();
router.use("/", routes);

export * from "./admin.controller";
export * from "./admin.models";

export default router;
