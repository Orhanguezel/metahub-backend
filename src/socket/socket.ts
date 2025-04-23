import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import Chat from "../modules/chat/chatMessage.model";
import ChatSession from "../modules/chat/chatSession.model";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";

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
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || [],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parse(cookieHeader || "");
      const token = cookies["accessToken"];

      if (token) {
        const secret = process.env.JWT_SECRET as string;
        const decoded = jwt.verify(token, secret) as IUserToken;
        socket.data.user = decoded;
      }

      next();
    } catch (err) {
      console.error("❌ Socket auth error:", err);
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

    // ✅ ChatSession kaydı
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
      console.error("❌ ChatSession kaydı yapılamadı:", err);
    }

    if (userId) {
      onlineUsers.set(userId, roomId);
      io.emit("online-users", Array.from(onlineUsers.entries()));
    }

    console.log(`🟢 Connected: ${userId ?? "Guest"} | Room: ${roomId}`);

    socket.on(
      "admin-message",
      async ({ room, message, language }: ChatMessagePayload) => {
        if (!message.trim() || !room) return;

        try {
          const adminChat = await Chat.create({
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

          console.log("✅ Admin message sent:", populated.get("message"));
        } catch (err) {
          console.error("❌ Admin message error:", err);
        }
      }
    );

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
        io.emit("online-users", Array.from(onlineUsers.entries()));
      }
      console.log(`🔴 Disconnected: ${userId ?? "Guest"}`);
    });
  });

  return io;
};
