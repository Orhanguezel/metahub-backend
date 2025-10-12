// src/modules/inventory/models.ts
import { Schema, model, models, type Model } from "mongoose";
import type { IInventory } from "./types";

/** Hem kanonik hem legacy stringleri destekleyen enum */
const MOVEMENT_ENUM = [
  // canonical
  "in", "out", "reserve", "release", "return", "adjust",
  // legacy
  "increase", "decrease", "order", "manual",
] as const;

const InventorySchema = new Schema<IInventory>(
  {
    tenant: { type: String, required: true, index: true, trim: true },
    product: { type: Schema.Types.ObjectId, ref: "product", required: true },

    onHand:    { type: Number, required: true, default: 0, min: 0 },
    reserved:  { type: Number, required: true, default: 0, min: 0 },
    available: { type: Number, required: true, default: 0 },
    safetyStock: { type: Number, default: 0, min: 0 },
    isLow: { type: Boolean, default: false },

    lastMovementAt: { type: Date },
    lastMovementId: { type: Schema.Types.ObjectId },
    lastMovementType: { type: String, enum: MOVEMENT_ENUM },
  },
  { timestamps: true }
);

/* Benzersiz: tenant + product */
InventorySchema.index({ tenant: 1, product: 1 }, { unique: true });

/* Sık sorgular: low stock taraması, son güncellemeler */
InventorySchema.index({ tenant: 1, isLow: 1, available: 1 });
InventorySchema.index({ tenant: 1, updatedAt: -1 });

/* Guard + türetmeler */
InventorySchema.pre("save", function (next) {
  this.onHand = Math.max(0, Number(this.onHand || 0));
  this.reserved = Math.max(0, Number(this.reserved || 0));
  this.available = Math.max(0, Number(this.onHand - this.reserved));
  this.isLow = Number(this.available) <= Number(this.safetyStock || 0);
  next();
});

export const InventoryModel: Model<IInventory> =
  models.inventory || model<IInventory>("inventory", InventorySchema);

/** 🔁 Geri uyumluluk: `Inventory` isimli named export da verelim */
export const Inventory = InventoryModel;

export default InventoryModel;
export type { IInventory };
