import express from "express";
import {
  getCompanyInfo,
  createCompany,
  updateCompanyInfo,
} from "./company.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

router
  .route("/")
  .get(authenticate, getCompanyInfo)
  .post(authenticate, authorizeRoles("admin"), createCompany);

router
  .route("/:id")
  .put(authenticate, authorizeRoles("admin"), updateCompanyInfo);

export default router;
