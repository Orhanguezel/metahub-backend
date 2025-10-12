import { Schema, model, models, type Model } from "mongoose";
import type { IReturnRMA, RMAStatus } from "./types";

const LineSchema = new Schema(
  {
    itemIndex: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const TimelineSchema = new Schema(
  {
    at: { type: Date, required: true },
    status: {
      type: String,
      enum: ["requested","approved","rejected","received","refunded","closed"],
      required: true,
    },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

const ReturnRMASchema = new Schema<IReturnRMA>(
  {
    tenant: { type: String, required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: "order", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "user" },
    code: { type: String, required: true, index: true, trim: true, uppercase: true },
    lines: { type: [LineSchema], default: [] },
    status: {
      type: String,
      enum: ["requested","approved","rejected","received","refunded","closed"],
      default: "requested",
      index: true,
    },
    timeline: { type: [TimelineSchema], default: [] },
  },
  { timestamps: true }
);

ReturnRMASchema.index({ tenant: 1, code: 1 }, { unique: true });

/* Code + timeline bootstrap */
ReturnRMASchema.pre("validate", function (next) {
  if (!this.code) {
    const y = new Date().getFullYear();
    (this as any).code = `RMA-${y}-${String(Date.now()).slice(-6)}`;
  }
  next();
});

ReturnRMASchema.pre("save", function (next) {
  if (!Array.isArray(this.timeline) || this.timeline.length === 0) {
    (this as any).timeline = [{ at: new Date(), status: this.status as RMAStatus }];
  }
  next();
});

export const ReturnRMA: Model<IReturnRMA> =
  models.returnrma || model<IReturnRMA>("returnrma", ReturnRMASchema);

export default ReturnRMA;
