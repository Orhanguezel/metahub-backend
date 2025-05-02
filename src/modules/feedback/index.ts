import express from "express";
import routes from "./feedback.routes";
import { Feedback } from "./feedback.models";

const router = express.Router();
router.use("/", routes);

export * from "./feedback.controller";
export * from "./feedback.validation";
export { Feedback };
export default router;
