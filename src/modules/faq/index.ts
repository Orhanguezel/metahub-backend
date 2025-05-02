// src/modules/faq/index.ts
import express from "express";
import routes from "./faq.routes";
import FAQ, { IFAQ } from "./faq.models";

const router = express.Router();
router.use("/", routes);

export { FAQ, IFAQ };
export * from "./faq.controller";
export * from "./faq.validation"; // ✔️ Validasyon export'u da ekliyoruz

export default router;
