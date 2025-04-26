import express from "express";
import routes from "./address.routes";
import  Address from "./address.models";

const router = express.Router();
router.use("/", routes);

export * from "./address.controller";
export { Address };
export * from "./address.models";
export default router;
