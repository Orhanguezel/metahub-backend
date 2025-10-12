import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
import {
  adminListWishlists,
  adminGetWishlistById,
  adminDeleteWishlist,
} from "./admin.controller";
import { validateObjectId, validateListQuery } from "./validation";

const router = express.Router();
router.use(authenticate, authorizeRoles("admin", "moderator"));

router.get("/", validateListQuery, adminListWishlists);
router.get("/:id", validateObjectId("id"), adminGetWishlistById);
router.delete("/:id", validateObjectId("id"), adminDeleteWishlist);

export default router;
