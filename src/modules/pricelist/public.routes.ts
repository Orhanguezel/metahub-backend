import express from "express";
import {
  getAllPriceListsPublic,
  getPriceListByCodePublic,
  getPriceForServicePublic,
} from "./public.controller";

const router = express.Router();

// Lists visible to public (active + in-window)
router.get("/",  getAllPriceListsPublic);

// List by code (with items)
router.get("/code/:code",  getPriceListByCodePublic);

// Quick price lookup for a service (by price list code)
router.get("/code/:code/price", getPriceForServicePublic);

export default router;
