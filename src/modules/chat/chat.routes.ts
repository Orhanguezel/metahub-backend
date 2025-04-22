// routes/chat.routes.ts
import express from "express";
import {
  getMessagesByRoom,
  getAllRoomsLastMessages,
  deleteMessage,
  deleteMessagesBulk,
  sendManualMessage,
  markMessagesAsRead,
  getArchivedSessions,
  getActiveChatSessions,
  getAllChatSessions,
} from "./chat.controller";
import { authenticate, authorizeRoles } from "../../core/middleware/authMiddleware";

const router = express.Router();

// 💬 Kullanıcı ve admin: Belirli odaya ait tüm mesajları getir
// Örn: GET /chat/room123
router.get("/:roomId", authenticate, getMessagesByRoom);

// 🔐 Admin: Tüm son sohbetleri (odalar bazında) listele
router.get("/", authenticate, authorizeRoles("admin"), getAllRoomsLastMessages);

// 🔐 Admin: Tekil mesaj silme
router.delete("/:id", authenticate, authorizeRoles("admin"), deleteMessage);

// 🔐 Admin: Çoklu mesaj silme
router.post("/bulk", authenticate, authorizeRoles("admin"), deleteMessagesBulk);

// 🧑‍💼 Admin: Manuel mesaj gönder (isteğe bağlı `lang` parametresi desteklenir)
// Body örneği:
// {
//   "roomId": "abc123",
//   "message": "Merhaba, size nasıl yardımcı olabilirim?",
//   "lang": "tr" // optional: tr | en | de
// }
router.post("/manual", authenticate, authorizeRoles("admin"), sendManualMessage);

router.patch("/read/:roomId", authenticate, authorizeRoles("admin"), markMessagesAsRead);

router.get("/archived", authenticate, authorizeRoles("admin"), getArchivedSessions);
router.get("/sessions/active", authenticate, authorizeRoles("admin"), getActiveChatSessions);
router.get("/sessions", authenticate, authorizeRoles("admin"), getAllChatSessions);




export default router;
