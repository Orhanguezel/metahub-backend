// src/modules/favorite/index.ts
import express from "express";
import routes from "./favorite.routes";

const router = express.Router();
router.use("/", routes);

export * from "./favorite.controller";
export { default as Favorite } from "./favorite.model";
export default router;


//import favoriteRouter, { Favorite } from "@/modules/favorite";

