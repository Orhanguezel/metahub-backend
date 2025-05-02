import express from "express";
import guestbookRoutes from "./guestbook.routes";
import Guestbook, { IGuestbookEntry } from "./guestbook.models";
import * as guestbookController from "./guestbook.controller";

const router = express.Router();
router.use("/", guestbookRoutes);

// ✅ Guard + Export
export { Guestbook, IGuestbookEntry, guestbookController };
export * from "./guestbook.validation";

export default router;
