import express from "express";
import routes from "./apikey.routes";
import { Apikey, Apikeylog } from "./apikey.models";

const router = express.Router();
router.use("/", routes);

export { Apikey, Apikeylog };

export * from "./apikey.controller";
export * from "./apikey.validation";

export default router;
