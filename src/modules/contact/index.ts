import express from "express";
import routes from "./contact.routes";

const router = express.Router();
router.use("/", routes);

export * from "./contact.controller";
export * from "./contact.models";

export default router;
