import express from "express";
import routes from "./guestbook.routes";
const router = express.Router();
router.use("/", routes);
export * from "./guestbook.controller";
export * from "./guestbook.models";
export default router;