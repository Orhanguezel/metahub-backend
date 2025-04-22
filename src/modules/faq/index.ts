import express from "express";
import routes from "./faq.routes";

const router = express.Router();
router.use("/", routes);

export * from "./faq.controller";
export * from "./faq.models";

export default router;
