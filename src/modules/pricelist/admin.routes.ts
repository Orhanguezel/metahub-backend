import express from "express";
import { authenticate, authorizeRoles } from "@/core/middleware/auth/authMiddleware";
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
  // catalog
  adminGetAllCatalogItems,
  adminCreateCatalogItem,
  adminUpdateCatalogItem,
  adminDeleteCatalogItem,
} from "./admin.controller";
import {
  validateObjectId,
  validateCreatePriceList,
  validateUpdatePriceList,
  validatePriceListAdminQuery,
  validateCreatePriceListItem,
  validateUpdatePriceListItem,
  validatePriceListItemsAdminQuery,
  // catalog validators
  validateCatalogAdminQuery,
  validateCreateCatalogItem,
  validateUpdateCatalogItem,
} from "./validation";
import { transformNestedFields } from "@/core/middleware/transformNestedFields";

const router = express.Router();

// 🔐 Admin guard
router.use(authenticate, authorizeRoles("admin", "moderator"));

/* ---- PriceLists (Master) ---- */
router.get("/", validatePriceListAdminQuery, adminGetAllPriceLists);
router.get("/:id", validateObjectId("id"), adminGetPriceListById);

router.post(
  "/",
  transformNestedFields(["name", "description"]),
  validateCreatePriceList,
  createPriceList
);

router.put(
  "/:id",
  transformNestedFields(["name", "description"]),
  validateObjectId("id"),
  validateUpdatePriceList,
  updatePriceList
);

router.delete("/:id", validateObjectId("id"), deletePriceList);

/* ---- List-mode Items ---- */
router.get(
  "/:listId/items",
  validateObjectId("listId"),
  validatePriceListItemsAdminQuery,
  adminGetAllPriceListItems
);

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

/* ---- Catalog Items (menuitem_variant/modifier/deposit/...) ---- */
router.get("/catalog", validateCatalogAdminQuery, adminGetAllCatalogItems);

router.post(
  "/catalog",
  transformNestedFields(["name", "description", "source"]),
  validateCreateCatalogItem,
  adminCreateCatalogItem
);

router.put(
  "/catalog/:id",
  transformNestedFields(["name", "description", "source"]),
  validateObjectId("id"),
  validateUpdateCatalogItem,
  adminUpdateCatalogItem
);

router.delete("/catalog/:id", validateObjectId("id"), adminDeleteCatalogItem);

export default router;
