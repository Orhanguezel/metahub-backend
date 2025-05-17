import express from "express";
import {
  getAllNews,
  getNewsById,
  getNewsBySlug,
} from "./public.news.controller";
import { validateObjectId } from "./news.validation";

const router = express.Router();

// 🌿 Public Endpoints
router.get("/", getAllNews); // tüm haberler
router.get("/slug/:slug", getNewsBySlug); // slug ile haber
router.get("/:id", validateObjectId("id"), getNewsById); // id ile haber

export default router;
