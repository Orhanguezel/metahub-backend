import express from "express";
import routes from "./news.routes";

const router = express.Router();
router.use("/", routes);

export * from "./news.controller";
export * from "./news.models";

export default router;
