import express from "express";
import routes from "./experience.routes";

const router = express.Router();
router.use("/", routes);

export * from "./experience.controller";
export * from "./experience.models";

export default router;
