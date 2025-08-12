import { Schema, Model, models, model } from "mongoose";
import type { IPriceList, IPriceListItem } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* ----------------- helpers ----------------- */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const l of SUPPORTED_LOCALES) fields[l] = { type: String, trim: true, default: "" };
  return fields;
};

const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

/* ----------------- PriceList ----------------- */
export const PriceListSchema = new Schema<IPriceList>(
  {
    tenant: { type: String, required: true, index: true },
    code:   { type: String, required: true, trim: true }, // UPPER_SNAKE

    name: localizedStringField(),
    description: localizedStringField(),

    defaultCurrency: { type: String, required: true, enum: ["USD", "EUR", "TRY"] },

    segment: { type: String, trim: true },
    region: { type: String, trim: true },
    apartmentCategoryIds: [{ type: Schema.Types.ObjectId, ref: "apartmentcategory" }],

    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },

    status: { type: String, enum: ["draft", "active", "archived"], default: "draft", index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false }
);

// Indexler
PriceListSchema.index({ tenant: 1, code: 1 }, { unique: true });
PriceListSchema.index({ tenant: 1, isActive: 1 });
PriceListSchema.index({ tenant: 1, status: 1, effectiveFrom: 1 });
PriceListSchema.index({ tenant: 1, region: 1, segment: 1 });

// Çok dilli arama için text index (opsiyonel ama faydalı)
const nameTextIndex: Record<string, "text"> = {};
for (const l of SUPPORTED_LOCALES) nameTextIndex[`name.${l}`] = "text";
PriceListSchema.index(nameTextIndex);

// Normalize
PriceListSchema.pre("validate", function (next) {
  if (this.code) {
    this.code = toUpperSnake(this.code);
  } else {
    // name içinden üret (ilk dolu locale)
    const n = this.name || ({} as any);
    const base =
      SUPPORTED_LOCALES.map((l) => (n[l] || "") as string).find((v) => v?.trim()) ||
      "PRICELIST";
    this.code = toUpperSnake(base);
  }
  next();
});

export const PriceList: Model<IPriceList> =
  models.pricelist || model<IPriceList>("pricelist", PriceListSchema);

/* ----------------- PriceListItem ----------------- */
export const PriceListItemSchema = new Schema<IPriceListItem>(
  {
    tenant: { type: String, required: true, index: true },
    listId: { type: Schema.Types.ObjectId, ref: "pricelist", required: true, index: true },
    serviceCode: { type: String, required: true, trim: true }, // UPPER_SNAKE

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USD", "EUR", "TRY"] },
    period: { type: String, required: true, enum: ["weekly", "monthly", "quarterly", "yearly", "once"] },
    notes: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// benzersizlik & yardımcı indexler
PriceListItemSchema.index({ tenant: 1, listId: 1, serviceCode: 1, period: 1 }, { unique: true });
PriceListItemSchema.index({ tenant: 1, serviceCode: 1, isActive: 1 });

// Normalize
PriceListItemSchema.pre("validate", function (next) {
  if (this.serviceCode) this.serviceCode = toUpperSnake(this.serviceCode);
  next();
});

export const PriceListItem: Model<IPriceListItem> =
  models.pricelistitem || model<IPriceListItem>("pricelistitem", PriceListItemSchema);
