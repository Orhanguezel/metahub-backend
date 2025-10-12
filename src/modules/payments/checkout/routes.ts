import express from "express";
import { createCheckout } from "./controller";
// ops: authenticate for logged-in; guest checkout serbest bırakılabilir
const router = express.Router();

router.post("/calc", createCheckout);

export default router;
