import express from "express";
import { publicSearch, publicSuggest, publicTrackSearch } from "./public.controller";
import { validatePublicSearchQuery, validateSuggestQuery, validateTrackSearch } from "./validation";

const router = express.Router();

router.get("/", validatePublicSearchQuery, publicSearch);
router.get("/suggest", validateSuggestQuery, publicSuggest);
router.post("/track", validateTrackSearch, publicTrackSearch);

export default router;
