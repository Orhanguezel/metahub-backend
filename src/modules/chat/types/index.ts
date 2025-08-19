import { Types } from "mongoose";
import type { TranslatedLabel } from "@/types/common";

// Chat mesajı
export interface IChatMessage {
  _id?: string;
  sender: Types.ObjectId | null;   // ref: "user"
  tenant: string;                  // zorunlu
  roomId: string;                  // string tutuluyor (geri uyumluluk)
  message: string;
  isFromBot?: boolean;
  isFromAdmin?: boolean;
  isRead?: boolean;
  language: TranslatedLabel;       // i18n: fillAllLocales ile doldurulur
  createdAt?: Date;
  updatedAt?: Date;
}

// Chat oturumu
export interface IChatSession {
  _id?: string;
  roomId: string;
  tenant: string;
  user?: Types.ObjectId;           // ref: "user"
  createdAt?: Date;
  closedAt?: Date;
}
