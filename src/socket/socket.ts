import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import { ChatMessage, ChatSession } from "@/modules/chat";
import { v4 as uuidv4 } from "uuid";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "@/socket/i18n";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";

interface ChatMessagePayload {
  room: string;
  message: string;
  language?: "tr" | "en" | "de";
}

interface IUserToken {
  id: string;
  email: string;
  name: string;
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

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parse(cookieHeader || "");
      const token = cookies["accessToken"];

      if (token) {
        const decoded = jwt.verify(token, jwtSecret) as IUserToken;
        socket.data.user = decoded;
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
    const user = socket.data.user;
    const userId = user?.id;
    const roomId = userId || uuidv4();

    socket.data.roomId = roomId;
    socket.join(roomId);
    socket.emit("room-assigned", roomId);

    try {
      await ChatSession.findOneAndUpdate(
        { roomId },
        {
          roomId,
          user: userId || undefined,
          createdAt: new Date(),
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      logger.error(
        t("socket.session.saveError", lang, translations) + ` ${err}`
      );
    }

    if (userId) {
      onlineUsers.set(userId, roomId);
      io.emit("online-users", Array.from(onlineUsers.entries()));
    }

    logger.info(
      t("socket.connection", lang, translations, {
        user: userId ?? "Guest",
        room: roomId,
      })
    );

    socket.on(
      "admin-message",
      async ({ room, message, language }: ChatMessagePayload) => {
        if (!message?.trim() || !room) return;

        try {
          const adminChat = await ChatMessage.create({
            sender: userId,
            roomId: room,
            message,
            isFromAdmin: true,
            isRead: true,
            language,
          });

          const populated = await adminChat.populate("sender", "name email");
          const sender = populated.sender as any;

          io.to(room).emit("chat-message", {
            _id: populated.id.toString(),
            message: populated.get("message"),
            sender: {
              _id: sender._id,
              name: sender.name,
              email: sender.email,
            },
            room,
            createdAt: populated.get("createdAt"),
            isFromAdmin: true,
            language: populated.get("language"),
          });

          logger.info(
            t("socket.adminMessage.success", lang, translations, {
              email: sender.email,
              room,
            })
          );
        } catch (err) {
          logger.error(
            t("socket.adminMessage.error", lang, translations) + ` ${err}`
          );
        }
      }
    );

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
