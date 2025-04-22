import express from "express";
import routes from "./comment.routes";

const router = express.Router();
router.use("/", routes);

export * from "./comment.controller";
export * from "./comment.models";

export default router;
