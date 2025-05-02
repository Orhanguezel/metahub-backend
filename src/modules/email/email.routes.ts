import express from "express";
import { 
  getAllMails, 
  getMailById, 
  deleteMail, 
  sendTestEmail,
  fetchEmailsManually,
  markAsReadOrUnread
} from "./email.controller";
import { authenticate, authorizeRoles } from "@/core/middleware/authMiddleware";

const router = express.Router();

router.use(authenticate, authorizeRoles("admin"));

router.post("/send", sendTestEmail);
router.get("/", getAllMails);
router.get("/fetch", fetchEmailsManually);
router.get("/:id", getMailById);
router.delete("/:id", deleteMail);
router.patch("/:id/read", markAsReadOrUnread);

export default router;

