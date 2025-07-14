import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/socket/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { SupportedLocale, TranslatedLabel } from "@/types/common";
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { getTenantModelsFromConnection } from "@/core/middleware/tenant/getTenantModelsFromConnection";

interface ChatMessagePayload {
  room?: string;
  roomId?: string; // Hem "room" hem "roomId" desteklenir
  message: string;
  language?: TranslatedLabel | string;
}

interface IUserToken {
  id: string;
  email: string;
  name: string;
  tenant: string;
  lang?: SupportedLocale;
}

export const initializeSocket = (server: HttpServer): SocketIOServer => {
  const lang = getLogLocale();
  const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim());
  const jwtSecret = process.env.JWT_SECRET;

  if (!corsOrigins || !jwtSecret) {
    logger.error(t("socket.env.error", lang, translations));
    throw new Error(t("socket.env.error", lang, translations));
  }

  const io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  // 1️⃣ Oturum kimliği, tenant slug vs parse edilir
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parse(cookieHeader || "");
      const token = cookies["accessToken"];
      if (token) {
        const decoded = jwt.verify(token, jwtSecret) as IUserToken;
        socket.data.user = decoded;
        socket.data.tenant = decoded.tenant || "";
        socket.data.lang = decoded.lang || "tr";
      }
      next();
    } catch (err) {
      logger.warn(
        t("socket.auth.tokenParseError", lang, translations) + ` ${err}`
      );
      next();
    }
  });

  const onlineUsers = new Map<string, string>();

  io.on("connection", async (socket: Socket) => {
  // 1️⃣ Tenant Algılama
  let tenant: string =
    socket.data.tenant ||
    (typeof socket.handshake.headers["x-tenant"] === "string"
      ? socket.handshake.headers["x-tenant"]
      : "") ||
    // Yeni ekle:
    (socket.handshake.query?.tenant as string) || // <-- Query’den oku!
    "";

  if (!tenant) {
    logger.error("[Socket] Tenant slug alınamadı. Bağlantı reddedildi.");
    return socket.disconnect(true);
  }

    // 3️⃣ DB bağlantısı ve model cache’i tenant’a göre alınır
    let conn;
    let models: any;
    try {
      conn = await getTenantDbConnection(tenant);
      models = getTenantModelsFromConnection(conn);
    } catch (err) {
      logger.error(`[Socket] Tenant bağlantısı kurulamadı: ${tenant} / ${err}`);
      return socket.disconnect(true);
    }

    // 4️⃣ Kullanıcı (JWT varsa) ve roomId
    const user = socket.data.user;
    const userId = user?.id;
    const userLang = socket.data.lang || "tr";
    const roomId = userId || uuidv4();

    socket.data.roomId = roomId;
    socket.data.tenant = tenant;
    socket.join(roomId);
    socket.emit("room-assigned", roomId);

    // 5️⃣ ChatSession kaydı
    try {
      await models.ChatSession.findOneAndUpdate(
        { roomId },
        {
          roomId,
          tenant,
          user: userId || undefined,
          createdAt: new Date(),
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      logger.error(t("socket.session.saveError", lang, translations) + ` ${err}`);
    }

    if (userId) {
      onlineUsers.set(userId, roomId);
      io.emit("online-users", Array.from(onlineUsers.entries()));
    }

    logger.info(
      t("socket.connection", lang, translations, {
        user: userId ?? "Guest",
        room: roomId,
        tenant,
      })
    );

    // 6️⃣ Kullanıcı mesajı (chat-message)
    socket.on("chat-message", async (payload: ChatMessagePayload) => {
      const room = payload.room || payload.roomId;
      const message = payload.message;
      const language = payload.language;
      if (!message?.trim() || !room) return;

      try {
        const preferredLang =
          (user?.lang as SupportedLocale) ||
          (typeof language === "string" ? undefined : undefined) ||
          "tr";
        let languageObj: TranslatedLabel;
        if (language && typeof language === "object") {
          languageObj = { ...fillAllLocales(message, preferredLang), ...language };
        } else if (typeof language === "string") {
          languageObj = fillAllLocales(language, preferredLang);
        } else {
          languageObj = fillAllLocales(message, preferredLang);
        }

        const newMsg = await models.ChatMessage.create({
          sender: userId ? userId : null,
          tenant,
          roomId: room,
          message,
          isFromBot: false,
          isFromAdmin: false,
          isRead: false,
          language: languageObj,
        });

        const populated = await newMsg.populate("sender", "name email");
        const sender = populated.sender as any;

        io.to(room).emit("chat-message", {
          _id: populated.id.toString(),
          message: populated.get("message"),
          sender: sender
            ? {
                _id: sender._id,
                name: sender.name,
                email: sender.email,
              }
            : null,
          roomId: room,
          tenant,
          createdAt: populated.get("createdAt"),
          isFromAdmin: false,
          isFromBot: false,
          isRead: false,
          language: populated.get("language"),
        });
      } catch (err) {
        logger.error(`[Socket] chat-message kaydetme hatası: ${err}`);
      }
    });

    // 7️⃣ Admin mesajı (admin-message)
    socket.on("admin-message", async ({ room, message, language }: ChatMessagePayload) => {
      if (!message?.trim() || !room) return;
      try {
        const preferredLang =
          (user?.lang as SupportedLocale) ||
          (typeof language === "string" ? undefined : undefined) ||
          "tr";
        let languageObj: TranslatedLabel;
        if (language && typeof language === "object") {
          languageObj = { ...fillAllLocales(message, preferredLang), ...language };
        } else if (typeof language === "string") {
          languageObj = fillAllLocales(message, preferredLang);
        } else {
          languageObj = fillAllLocales(message, preferredLang);
        }

        const adminChat = await models.ChatMessage.create({
          sender: userId ? userId : null,
          tenant,
          roomId: room,
          message,
          isFromAdmin: true,
          isRead: true,
          language: languageObj,
        });

        const populated = await adminChat.populate("sender", "name email");
        const sender = populated.sender as any;

        io.to(room).emit("chat-message", {
          _id: populated.id.toString(),
          message: populated.get("message"),
          sender: sender
            ? {
                _id: sender._id,
                name: sender.name,
                email: sender.email,
              }
            : null,
          roomId: room,
          tenant,
          createdAt: populated.get("createdAt"),
          isFromAdmin: true,
          isFromBot: false,
          isRead: true,
          language: populated.get("language"),
        });

        logger.info(
          t("socket.adminMessage.success", lang, translations, {
            email: sender?.email,
            room,
            tenant,
          })
        );
      } catch (err) {
        logger.error(
          t("socket.adminMessage.error", lang, translations) + ` ${err}`
        );
      }
    });

    // 8️⃣ Disconnect eventi
    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
        io.emit("online-users", Array.from(onlineUsers.entries()));
      }
      logger.info(
        t("socket.disconnect", lang, translations, { user: userId ?? "Guest" })
      );
    });
  });

  return io;
};
