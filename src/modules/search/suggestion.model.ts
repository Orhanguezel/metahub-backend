// src/modules/search/suggestion.model.ts
import { Schema, model, models, type Model } from "mongoose";

export interface ISuggestion {
  tenant: string;
  q: string;                       // anahtar kelime
  type: "product" | "brand" | "category" | "search";
  weight?: number;                 // 1..n
  createdAt?: Date;
  updatedAt?: Date;
}

const SuggestionSchema = new Schema<ISuggestion>(
  {
    tenant: { type: String, required: true, index: true },
    q: { type: String, required: true, trim: true },
    type: { type: String, enum: ["product","brand","category","search"], default: "search", index: true },
    weight: { type: Number, default: 1 },
  },
  { timestamps: true }
);

SuggestionSchema.index({ tenant: 1, q: 1, type: 1 }, { unique: true });

export const Suggestion: Model<ISuggestion> =
  models.suggestion || model<ISuggestion>("suggestion", SuggestionSchema);
export default Suggestion;
