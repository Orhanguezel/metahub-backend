import express from "express";
import guestbookRoutes from "./guestbook.routes";
import Guestbook from "./guestbook.models";
import * as guestbookController from "./guestbook.controller";

const router = express.Router();
router.use("/", guestbookRoutes);

export { Guestbook, guestbookController };
export default router;
