import express from "express";
import {
  getAllContactsPublic,
  getContactByIdPublic,
  getContactBySlugPublic,
} from "./public.controller";
import { validateObjectId, validateContactsPublicQuery } from "./validation";

const router = express.Router();

router.get("/", validateContactsPublicQuery, getAllContactsPublic);
router.get("/slug/:slug", getContactBySlugPublic);
router.get("/:id", validateObjectId("id"), getContactByIdPublic);

export default router;
