import express from "express";
import { publicGetFileMeta } from "./public.controller";
import { validateObjectId } from "./validation";

const router = express.Router();

router.get("/:id", validateObjectId("id"), publicGetFileMeta);
// router.get("/:id/stream", validateObjectId("id"), publicStream); // istersen

export default router;
