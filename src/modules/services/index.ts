import express from "express";
import routes from "./services.routes";

const router = express.Router();
router.use("/", routes);

export * from "./services.controller";
export * from "./services.models";

export default router;
