import express from "express";
import routes from "./experience.routes";

export { default as Experience } from "./experience.models";
export * from "./experience.controller";

const router = express.Router();
router.use("/", routes);

export default router;
