import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";
import {
  createPriceList,
  updatePriceList,
  adminGetAllPriceLists,
  adminGetPriceListById,
  deletePriceList,
  createPriceListItem,
  updatePriceListItem,
  adminGetAllPriceListItems,
  deletePriceListItem,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreatePriceList,
  validateUpdatePriceList,
  validatePriceListAdminQuery,
  validateCreatePriceListItem,
  validateUpdatePriceListItem,
  validatePriceListItemsAdminQuery,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// Admin guard
router.use(authenticate, authorizeRoles("admin", "moderator"));

// PriceLists
router.get("/", validatePriceListAdminQuery, adminGetAllPriceLists);
router.get("/:id", validateObjectId("id"), adminGetPriceListById);

router.post(
  "/",
  transformNestedFields(["name", "description", "apartmentCategoryIds"]),
  validateCreatePriceList,
  createPriceList
);

router.put(
  "/:id",
  transformNestedFields(["name", "description", "apartmentCategoryIds"]),
  validateObjectId("id"),
  validateUpdatePriceList,
  updatePriceList
);

router.delete("/:id", validateObjectId("id"), deletePriceList);

// PriceList Items
router.get("/:listId/items", validateObjectId("listId"), validatePriceListItemsAdminQuery, adminGetAllPriceListItems);

router.post(
  "/:listId/items",
  validateObjectId("listId"),
  validateCreatePriceListItem,
  createPriceListItem
);

router.put(
  "/:listId/items/:itemId",
  validateObjectId("listId"),
  validateObjectId("itemId"),
  validateUpdatePriceListItem,
  updatePriceListItem
);

router.delete(
  "/:listId/items/:itemId",
  validateObjectId("listId"),
  validateObjectId("itemId"),
  deletePriceListItem
);

export default router;
