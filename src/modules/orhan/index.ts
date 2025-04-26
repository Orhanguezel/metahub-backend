import express from "express";
import routes from "./orhan.routes";

const router = express.Router();
router.use("/", routes);

export * from "./orhan.controller";
export * from "./orhan.models";
export default router;
