import { Types } from "mongoose";
import type { SupportedLocale, TranslatedLabel } from "@/types/common";

// Chat mesajı
export interface IChatMessage {
  _id?: string;
  sender: Types.ObjectId | null;
  tenant: string;                // her zaman zorunlu!
  roomId: string;
  message: string;
  isFromBot?: boolean;
  isFromAdmin?: boolean;
  isRead?: boolean;
  language: TranslatedLabel;        
  createdAt?: Date;
  updatedAt?: Date;
}

// Chat oturumu
export interface IChatSession {
  _id?: string;
  roomId: string;
  tenant: string;
  user?: Types.ObjectId;
  createdAt?: Date;
  closedAt?: Date;
}
