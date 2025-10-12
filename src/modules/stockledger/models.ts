import { Schema, model, models, Types, Model } from "mongoose";

import type { IStockledger } from "./types";

const StockledgerSchema = new Schema<IStockledger>(
  {
    product: { type: Schema.Types.ObjectId, ref: "product", required: true },
    type: {
      type: String,
      enum: [
        // kanonik
        "in", "out", "reserve", "release", "return", "adjust",
        // legacy
        "increase", "decrease", "order", "manual",
      ],
      required: true,
    },
    tenant: { type: String, required: true, index: true, trim: true },
    quantity: { type: Number, required: true },
    note: {
      tr: { type: String, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "user", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

/* İndeksler */
StockledgerSchema.index({ tenant: 1, product: 1, createdAt: -1 });
StockledgerSchema.index({ tenant: 1, type: 1, createdAt: -1 });

export const Stockledger: Model<IStockledger> =
  (models.stockledger as Model<IStockledger>) ||
  model<IStockledger>("stockledger", StockledgerSchema);

export default Stockledger;
