import express from "express";
import routes from "./category.routes";
import { LibraryCategory } from "./category.models";
import * as LibraryCategoryController from "./category.controller";

const router = express.Router();
router.use("/", routes);

// ✅ Named Exports (standards)
export { LibraryCategory, LibraryCategoryController };
export * from "./category.validation";
export default router;
