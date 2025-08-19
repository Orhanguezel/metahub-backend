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
  roomId?: string; // her ikisi de desteklenir
  message: string;
  language?: TranslatedLabel | string;
}

interface IUserToken {
  id: string;
  email: string;
  name: string;
  tenant: string;
  lang?: SupportedLocale;
  role?: string; // admin-message için basit rol kontrolü
}

type TenantKey = string; // "gzl"
type UserKey = string;   // tenant:userId

// Tenant modellerinin tipi (getTenantModelsFromConnection’un dönüş tipinden türet)
type TenantModels = ReturnType<typeof getTenantModelsFromConnection>;

// Basit rate limit (mesaj spam'ine karşı)
const RL_MAX = 10;            // 10 mesaj
const RL_WINDOW_MS = 5_000;   // 5 saniye

export const initializeSocket = (server: HttpServer): SocketIOServer => {
  const lang = getLogLocale();
  const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim());
  const jwtSecret = process.env.JWT_SECRET;

  if (!corsOrigins || !jwtSecret) {
    logger.error(t("socket.env.error", lang, translations));
    throw new Error(t("socket.env.error", lang, translations));
  }

  const io = new SocketIOServer(server, {
    cors: { origin: corsOrigins, credentials: true },
  });

  // 1) Auth & Context (cookie → JWT → socket.data)
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
        socket.data.role = decoded.role || "user";
      }
      next();
    } catch (err) {
      logger.warn(t("socket.auth.tokenParseError", lang, translations) + ` ${err}`);
      next();
    }
  });

  // online kullanıcı haritası: tenant:userId → roomId
  const onlineUsers = new Map<UserKey, string>();

  io.on("connection", async (socket: Socket) => {
    // 2) Tenant çöz (JWT → header → query)
    const tenant: TenantKey =
      socket.data.tenant ||
      (typeof socket.handshake.headers["x-tenant"] === "string" ? socket.handshake.headers["x-tenant"] : "") ||
      (socket.handshake.query?.tenant as string) ||
      "";

    if (!tenant) {
      logger.error("[Socket] Tenant slug alınamadı. Bağlantı reddedildi.");
      return socket.disconnect(true);
    }

    // 3) Tenant DB/Modeller — tipli ve 'conn' için any yok
    let models!: TenantModels; // definite assignment
    try {
      const conn = await getTenantDbConnection(tenant);     // mongoose.Connection
      models = getTenantModelsFromConnection(conn);         // TenantModels
    } catch (err) {
      logger.error(`[Socket] Tenant bağlantısı kurulamadı: ${tenant} / ${err}`);
      return socket.disconnect(true);
    }

    // 4) Kullanıcı ve default oda
    const user = socket.data.user as IUserToken | undefined;
    const userId = user?.id;
    const defaultRoomId = userId || uuidv4();

    socket.data.roomId = defaultRoomId;
    socket.data.tenant = tenant;

    // Kişisel odaya join (DM bildirimleri vs. için faydalı)
    socket.join(defaultRoomId);
    socket.emit("room-assigned", defaultRoomId);

    // 5) ChatSession upsert (tenant filtreli!)
    try {
      await models.ChatSession.findOneAndUpdate(
        { tenant, roomId: defaultRoomId },
        { $setOnInsert: { roomId: defaultRoomId, tenant, user: userId || undefined, createdAt: new Date() } },
        { upsert: true, new: true }
      );
    } catch (err) {
      logger.error(t("socket.session.saveError", lang, translations) + ` ${err}`);
    }

    if (userId) {
      const key: UserKey = `${tenant}:${userId}`;
      onlineUsers.set(key, defaultRoomId);
      io.emit("online-users", Array.from(onlineUsers.entries()));
    }

    logger.info(
      t("socket.connection", lang, translations, {
        user: userId ?? "Guest",
        room: defaultRoomId,
        tenant,
      })
    );

    // === ODA YÖNETİMİ (forum/channel/chat için gerekli) ===

    // Odaya katıl
    socket.on("join-room", async (payload: { roomId: string }) => {
      const room = String(payload?.roomId || "").trim();
      if (!room || room.length > 128) return;

      // Oda/session yoksa oluştur (tenant izolasyonuyla)
      try {
        await models.ChatSession.updateOne(
          { tenant, roomId: room },
          { $setOnInsert: { tenant, roomId: room, user: userId || undefined, createdAt: new Date() } },
          { upsert: true }
        );
      } catch (e) {
        logger.warn(`[Socket] join-room upsert uyarısı: ${e}`);
      }

      socket.join(room);
      socket.emit("joined-room", { roomId: room });
    });

    // Odadan ayrıl
    socket.on("leave-room", async (payload: { roomId: string }) => {
      const room = String(payload?.roomId || "").trim();
      if (!room) return;
      socket.leave(room);
      socket.emit("left-room", { roomId: room });
    });

    // === RATE LIMIT STATE ===
    let msgCount = 0;
    let windowStart = Date.now();
    const allowMessage = () => {
      const now = Date.now();
      if (now - windowStart > RL_WINDOW_MS) {
        windowStart = now; msgCount = 0;
      }
      msgCount += 1;
      return msgCount <= RL_MAX;
    };

    // === KULLANICI MESAJI ===
    socket.on("chat-message", async (payload: ChatMessagePayload) => {
      try {
        const room = String(payload.room || payload.roomId || "").trim();
        const message = String(payload.message || "");
        const language = payload.language;

        if (!room || !message.trim()) return;
        if (message.length > 5000) return;        // şema ile uyumlu limit
        if (!allowMessage()) return;              // basit rate limit

        const preferredLang = (user?.lang as SupportedLocale) || "tr";
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

        const payloadOut = {
          _id: populated.id.toString(),
          message: populated.get("message"),
          sender: sender ? { _id: sender._id, name: sender.name, email: sender.email } : null,
          roomId: room,
          tenant,
          createdAt: populated.get("createdAt"),
          isFromAdmin: false,
          isFromBot: false,
          isRead: false,
          language: populated.get("language"),
        };

        // Socket.IO publish
        io.to(room).emit("chat-message", payloadOut);
      } catch (err) {
        logger.error(`[Socket] chat-message kaydetme hatası: ${err}`);
      }
    });

    // === ADMIN MESAJI ===
    socket.on("admin-message", async ({ room, roomId, message, language }: ChatMessagePayload) => {
      try {
        const target = String(room || roomId || "").trim();
        const msg = String(message || "");
        if (!target || !msg.trim()) return;

        // Basit rol kontrolü
        const role = socket.data.role as string | undefined;
        const isAdmin = role === "admin" || role === "superadmin";
        if (!isAdmin) {
          logger.warn(`[Socket] admin-message yetkisiz istek. user=${userId}`);
          return;
        }

        const preferredLang = (user?.lang as SupportedLocale) || "tr";
        let languageObj: TranslatedLabel;
        if (language && typeof language === "object") {
          languageObj = { ...fillAllLocales(msg, preferredLang), ...language };
        } else if (typeof language === "string") {
          languageObj = fillAllLocales(language, preferredLang);
        } else {
          languageObj = fillAllLocales(msg, preferredLang);
        }

        const adminChat = await models.ChatMessage.create({
          sender: userId ? userId : null,
          tenant,
          roomId: target,
          message: msg,
          isFromAdmin: true,
          isRead: true,
          language: languageObj,
        });

        const populated = await adminChat.populate("sender", "name email");
        const sender = populated.sender as any;

        const payloadOut = {
          _id: populated.id.toString(),
          message: populated.get("message"),
          sender: sender ? { _id: sender._id, name: sender.name, email: sender.email } : null,
          roomId: target,
          tenant,
          createdAt: populated.get("createdAt"),
          isFromAdmin: true,
          isFromBot: false,
          isRead: true,
          language: populated.get("language"),
        };

        io.to(target).emit("chat-message", payloadOut);

        logger.info(t("socket.adminMessage.success", lang, translations, {
          email: sender?.email, room: target, tenant,
        }));
      } catch (err) {
        logger.error(t("socket.adminMessage.error", lang, translations) + ` ${err}`);
      }
    });

    // === Disconnect ===
    socket.on("disconnect", () => {
      const uId = userId; // closure safety
      if (uId) {
        const key: UserKey = `${tenant}:${uId}`;
        onlineUsers.delete(key);
        io.emit("online-users", Array.from(onlineUsers.entries()));
      }
      logger.info(t("socket.disconnect", lang, translations, { user: userId ?? "Guest" }));
    });
  });

  return io;
};
