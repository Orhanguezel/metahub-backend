import express from "express";

// Admin & Public Router'ları
import adminRoutes from "./admin.routes";
import publicRoutes from "./public.routes";

// Model & Interface
import {FAQ} from "./faq.models";

// Controller export
import * as adminController from "./admin.controller";
import * as publicController from "./public.controller";

// Validation export
import * as validation from "./validation";

const router = express.Router();

// Admin panel erişimi
router.use("/admin", adminRoutes);

// Public erişim
router.use("/", publicRoutes);



export { FAQ, adminController, publicController, validation };
export default router;
