import express from "express";
import { publicGetMenuCategories } from "./public.controller";
import { validatePublicQuery } from "./validation";

const router = express.Router();

router.get("/", validatePublicQuery, publicGetMenuCategories);

export default router;
