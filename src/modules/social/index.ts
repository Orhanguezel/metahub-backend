import express from "express";
import routes from "./social.routes";

const router = express.Router();
router.use("/", routes);

export * from "./social.controller";
export * from "./social.models";

export default router;
