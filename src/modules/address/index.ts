import express from "express";
import addressRoutes from "./address.routes";
import  {Address } from "./address.models";
import * as addressController from "./address.controller";
import * as addressValidation from "./address.validation";

const router = express.Router();
router.use("/", addressRoutes);

export { Address, addressController, addressValidation };
export default router;
