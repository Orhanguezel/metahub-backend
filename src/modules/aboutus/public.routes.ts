import express from "express";
import { getAllAboutus, getAboutusById, getAboutusBySlug } from "./public.controller";
import { validateObjectId, validatePublicQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, getAllAboutus);
router.get("/slug/:slug", getAboutusBySlug);
router.get("/:id", validateObjectId("id"), getAboutusById);

export default router;
