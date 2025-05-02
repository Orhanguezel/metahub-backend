import express from "express";
import companyRoutes from "./company.routes";
import { Company, ICompany } from "./company.models";
import * as companyController from "./company.controller";

const router = express.Router();
router.use("/", companyRoutes);

// ✅ Guard + Export (This module has been updated and is now standardized)
export { Company, ICompany, companyController };
export * from "./company.validation";

export default router;
