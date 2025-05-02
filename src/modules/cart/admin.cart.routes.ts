import { Router } from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import { validateRequest } from "@/core/middleware/validateRequest";
import {
  getAllCarts,
  getSingleCart,
  updateCart,
  deleteCart,
  toggleCartActiveStatus,
} from "./admin.cart.controller";
import {
  updateCartValidator,
  cartIdParamValidator,
} from "./cart.validation";
import { analyticsLogger } from "@/core/middleware/analyticsLogger"; // ✅ Added

const router = Router();

router.use(authenticate, authorizeRoles("admin"), analyticsLogger); // ✅ Logger added

// ✅ Admin routes
router.get("/", getAllCarts);

router.get("/:id", cartIdParamValidator, validateRequest, getSingleCart);

router.put("/:id", cartIdParamValidator, updateCartValidator, validateRequest, updateCart);

router.delete("/:id", cartIdParamValidator, validateRequest, deleteCart);

router.patch("/:id/toggle-active", cartIdParamValidator, validateRequest, toggleCartActiveStatus);

export default router;
