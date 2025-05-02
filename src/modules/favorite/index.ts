import express from "express";
import routes from "./favorite.routes";

const router = express.Router();
router.use("/", routes);

export * from "./favorite.controller";
export * from "./favorite.validation";
export { default as Favorite } from "./favorite.model";

export default router;
