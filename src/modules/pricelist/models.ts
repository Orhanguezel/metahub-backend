import { Schema, Model, models, model } from "mongoose";
import type {
  IPriceList,
  IPriceListItem,
  IPriceListItemSourceRef,
  PriceListItemKind,
} from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* ------------- helpers ------------- */
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const l of SUPPORTED_LOCALES) fields[l] = { type: String, trim: true, default: "" };
  return fields;
};

const toUpperSnake = (s: string) =>
  s?.toString().trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "").toUpperCase();

const codeRegex = /^[a-z0-9][a-z0-9-_]{1,63}$/i;

/* ------------- PriceList ------------- */
export const PriceListSchema = new Schema<IPriceList>(
  {
    tenant: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true }, // UPPER_SNAKE

    name: localizedStringField(),
    description: localizedStringField(),

    defaultCurrency: { type: String, required: true, enum: ["USD", "EUR", "TRY", "GBP"] },

    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },

    status: { type: String, enum: ["draft", "active", "archived"], default: "draft", index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false }
);

/* indexes */
PriceListSchema.index({ tenant: 1, code: 1 }, { unique: true });
PriceListSchema.index({ tenant: 1, isActive: 1 });
PriceListSchema.index({ tenant: 1, status: 1, effectiveFrom: 1 });

/* text index for i18n name */
const nameTextIndex: Record<string, "text"> = {};
for (const l of SUPPORTED_LOCALES) nameTextIndex[`name.${l}`] = "text";
PriceListSchema.index(nameTextIndex);

/* normalize */
PriceListSchema.pre("validate", function (next) {
  if (this.code) {
    this.code = toUpperSnake(this.code);
  } else {
    const n = this.name || ({} as any);
    const base =
      SUPPORTED_LOCALES.map((l) => (n[l] || "") as string).find((v) => v?.trim()) || "PRICELIST";
    this.code = toUpperSnake(base);
  }
  next();
});

export const PriceList: Model<IPriceList> =
  (models as any).pricelist || model<IPriceList>("pricelist", PriceListSchema);

/* ------------- PriceListItem (UNIFIED) ------------- */

const SourceRefSchema = new Schema<IPriceListItemSourceRef>(
  {
    module: { type: String, trim: true },
    entity: { type: String, trim: true },
    refId: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

export const PriceListItemSchema = new Schema<IPriceListItem>(
  {
    tenant: { type: String, required: true, index: true },

    /* mode */
    kind: { type: String, enum: ["list", "catalog"], default: "list", index: true },

    /* LIST MODE */
    listId: { type: Schema.Types.ObjectId, ref: "pricelist", index: true },
    serviceCode: { type: String, trim: true }, // UPPER_SNAKE
    amount: { type: Number, min: 0 },
    period: {
      type: String,
      enum: ["weekly", "ten_days", "fifteen_days", "monthly", "quarterly", "yearly", "once"],
    },
    notes: { type: String, trim: true },

    /* CATALOG MODE */
    code: { type: String, trim: true, lowercase: true, match: [codeRegex, "Invalid code"], index: true },
    name: { type: Object, default: () => localizedStringField() },
    description: { type: Object, default: () => localizedStringField() },
    category: {
      type: String,
      enum: ["menuitem_variant", "menuitem_modifier", "deposit", "delivery_fee", "service_fee", "custom"],
      index: true,
    },
    price: { type: Number, min: 0 },
    currency: { type: String, enum: ["USD", "EUR", "TRY", "GBP"], default: "TRY", index: true },
    tags: { type: [String], default: [], index: true },
    validFrom: { type: Date },
    validTo: { type: Date },
    source: { type: SourceRefSchema },

    /* ortak */
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

/* --- Indexes --- */
/* legacy unique (LIST) */
PriceListItemSchema.index(
  { tenant: 1, listId: 1, serviceCode: 1, period: 1 },
  { unique: true, partialFilterExpression: { kind: "list" } } // partial ile yalnız list modunda uygulanır
);

/* catalog unique (CODE) */
PriceListItemSchema.index(
  { tenant: 1, code: 1 },
  { unique: true, partialFilterExpression: { kind: "catalog" } }
);

/* generic filters */
PriceListItemSchema.index({ tenant: 1, validFrom: 1, validTo: 1 });
PriceListItemSchema.index({ tenant: 1, category: 1, isActive: 1 });

/* --- Conditional validation --- */
PriceListItemSchema.pre("validate", function (next) {
  const anyThis: any = this;
  const kind: PriceListItemKind = anyThis.kind || "list";

  if (kind === "list") {
    // required: listId, serviceCode, amount, period
    if (!anyThis.listId || !anyThis.serviceCode || anyThis.amount == null || !anyThis.period) {
      return next(new Error("LIST item requires listId, serviceCode, amount and period."));
    }
    anyThis.serviceCode = toUpperSnake(anyThis.serviceCode);
    // temizle (catalog alanlarını boşaltmak zorunlu değil; ama tutarlılık için null geçebilir)
    return next();
  }

  // catalog
  if (!anyThis.code || anyThis.price == null) {
    return next(new Error("CATALOG item requires code and price."));
  }
  // tarih aralığı kontrolü
  if (anyThis.validFrom && anyThis.validTo && new Date(anyThis.validFrom) > new Date(anyThis.validTo)) {
    return next(new Error("Invalid date range: validFrom must be <= validTo."));
  }
  next();
});

export const PriceListItem: Model<IPriceListItem> =
  (models as any).pricelistitem || model<IPriceListItem>("pricelistitem", PriceListItemSchema);
