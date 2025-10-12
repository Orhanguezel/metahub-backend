import type { Types } from "mongoose";

/** Yeni kanonik tipler */
export type CanonicalMovementType =
  | "in"        // giriş
  | "out"       // çıkış
  | "reserve"   // sipariş için ayırma
  | "release"   // rezerv çözme
  | "return"    // iade giriş
  | "adjust";   // düzeltme

/** Geriye dönük uyumluluk için desteklenen eski tip adları */
export type LegacyMovementType =
  | "increase"  // -> in
  | "decrease"  // -> out
  | "order"     // -> reserve
  | "manual";   // -> adjust

export type MovementType = CanonicalMovementType | LegacyMovementType;

export interface IStockledger {
  product: Types.ObjectId;
  type: MovementType;      // DB enum'u hem yeni hem legacy'yi kabul eder
  quantity: number;        // (+) ya da düz miktar; iş kurallarında yorumlanır
  tenant: string;
  note?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  createdBy?: Types.ObjectId | null;
  createdAt?: Date;
}