import express from "express";
import {
  getAllPriceListsPublic,
  getPriceListByCodePublic,
  getPriceForServicePublic,
} from "./public.controller";
import { validatePublicListQuery, validateCodeParam, validatePriceLookupQuery } from "./validation";

const router = express.Router();

// Lists visible to public (active + in-window)
router.get("/", validatePublicListQuery, getAllPriceListsPublic);

// List by code (with items)
router.get("/code/:code", validateCodeParam, getPriceListByCodePublic);

// Quick price lookup for a service (by price list code)
router.get("/code/:code/price", validateCodeParam, validatePriceLookupQuery, getPriceForServicePublic);

export default router;
