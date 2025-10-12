import type { Document, Types } from "mongoose";

/** Kanonik tipler (yeni) */
export type CanonicalMovementType =
  | "in"        // fiziksel giriş (+onHand)
  | "out"       // fiziksel çıkış (-onHand)
  | "reserve"   // rezerv (+reserved)
  | "release"   // rezerv bırak (-reserved)
  | "return"    // iade (+onHand)
  | "adjust";   // manuel düzeltme (+/- onHand)

/** Legacy tipler (mevcut sistemde görülebilir) */
export type LegacyMovementType =
  | "increase"  // -> "in"
  | "decrease"  // -> "out"
  | "order"     // -> "reserve"
  | "manual"    // -> "adjust"
  | "return"
  | "adjust";

/** Ortak tip: hem kanonik hem legacy değerleri kapsar */
export type MovementType = CanonicalMovementType | LegacyMovementType;

export interface IInventory extends Document {
  tenant: string;
  product: Types.ObjectId;

  onHand: number;       // fiziksel mevcut
  reserved: number;     // rezerve
  available: number;    // onHand - reserved (persisted)
  safetyStock?: number; // eşik
  isLow: boolean;       // available <= safetyStock ?

  lastMovementAt?: Date;
  lastMovementId?: Types.ObjectId;
  lastMovementType?: MovementType;

  createdAt?: Date;
  updatedAt?: Date;
}

export type InventoryDelta = {
  dOnHand: number;
  dReserved: number;
};
