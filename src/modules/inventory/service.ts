// src/modules/inventory/service.ts
import { Types, Model } from "mongoose";
import type { IInventory, MovementType, InventoryDelta } from "./types";

function movementToDelta(type: MovementType, qty: number): InventoryDelta {
  const q = Math.abs(Number(qty || 0));
  switch (String(type)) {
    case "in":
    case "increase":
    case "return":
      return { dOnHand: q, dReserved: 0 };
    case "out":
    case "decrease":
      return { dOnHand: -q, dReserved: 0 };
    case "reserve":
    case "order":
      return { dOnHand: 0, dReserved: q };
    case "release":
      return { dOnHand: 0, dReserved: -q };
    case "adjust":
    case "manual":
      return { dOnHand: Number(qty || 0), dReserved: 0 }; // adjust ± olabilir
    default:
      return { dOnHand: 0, dReserved: 0 };
  }
}

export async function applyStockLedgerToInventory(params: {
  Inventory: Model<IInventory>;
  tenant: string;
  product: string | Types.ObjectId;
  movementId?: string | Types.ObjectId;
  movementType: MovementType;
  quantity: number;
  movementAt?: Date;
}) {
  const { Inventory, tenant, product, movementId, movementType, quantity } = params;
  const { dOnHand, dReserved } = movementToDelta(movementType, quantity);
  const now = new Date(params.movementAt || Date.now());

  // 1) Doc’u oluştur ya da getir
  const doc = await Inventory.findOneAndUpdate(
    { tenant, product },
    { $setOnInsert: { tenant, product, onHand: 0, reserved: 0, available: 0, safetyStock: 0, isLow: false } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 2) Uygulama tarafında hesapla (çatışmasız)
  const onHand = Math.max(0, Number(doc.onHand || 0) + dOnHand);
  const reserved = Math.max(0, Number(doc.reserved || 0) + dReserved);
  const available = Math.max(0, onHand - reserved);

  doc.onHand = onHand;
  doc.reserved = reserved;
  doc.available = available;
  doc.isLow = available <= Number(doc.safetyStock || 0);
  doc.lastMovementAt = now;
  doc.lastMovementType = movementType as any;
  if (movementId) (doc as any).lastMovementId = movementId;

  await doc.save();
}
