import express from "express";
import routes from "./blog.routes";

const router = express.Router();
router.use("/", routes);

export * from "./blog.controller";
export * from "./blog.models";

export default router;
