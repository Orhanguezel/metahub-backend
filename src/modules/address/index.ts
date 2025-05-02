import express from "express";
import addressRoutes from "./address.routes";
import Address, { IAddress } from "./address.models";
import * as addressController from "./address.controller";
import * as addressValidation from "./address.validation";

const router = express.Router();
router.use("/", addressRoutes);

export { Address, IAddress, addressController, addressValidation };
export default router;
