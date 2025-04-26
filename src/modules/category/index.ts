import express from "express";
import router from "./category.routes";
import { Category } from "./category.models";

const appRouter = express.Router();
appRouter.use("/", router);

export * from "./category.controller";
export * from "./admin.category.controller";
export { Category };
export default appRouter;
