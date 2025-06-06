import express from "express";
import publicRoutes from "./public.apartment.routes";
import adminRoutes from "./admin.apartment.routes";
import { Apartment } from "./apartment.model";
import * as publicApartmentController from "./public.apartment.controller";
import * as adminApartmentController from "./admin.apartment.controller";
import * as ApartmentValidation from "./apartment.validation";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export {
  Apartment,
  publicApartmentController,
  adminApartmentController,
  ApartmentValidation,
};

export default router;
