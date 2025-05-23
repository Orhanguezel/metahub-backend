// src/modules/wishlist/index.ts
import express from "express";
import routes from "./wishlist.routes";

import  {Wishlist } from "./wishlist.models";
import * as wishlistController from "./wishlist.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Guardlı export + controller + validation
export { Wishlist, wishlistController };
export * from "./wishlist.validation";

export default router;
