import express from "express";
import {
  getAllPriceListsPublic,
  getPriceListByCodePublic,
  getPriceForServicePublic,
  publicGetCatalogItems,
  publicGetCatalogItemByCode,
} from "./public.controller";
import {
  validatePublicCatalogQuery,
  validatePublicPriceQuery
} from "./validation";

const router = express.Router();

/* Price Lists (active + window) */
router.get("/", getAllPriceListsPublic);
router.get("/code/:code", getPriceListByCodePublic);
router.get("/code/:code/price", validatePublicPriceQuery, getPriceForServicePublic);

/* Catalog items (public) */
router.get("/catalog", validatePublicCatalogQuery, publicGetCatalogItems);
router.get("/catalog/:code", publicGetCatalogItemByCode);

export default router;
