import express from "express";
import routes from "./wishlist.routes";
import Wishlist from "./wishlist.models";

const router = express.Router();

router.use("/", routes);

export * from "./wishlist.controller";
export * from "./wishlist.models";
export { Wishlist };
export default router;
