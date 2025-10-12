import { Schema, model, Types, Model, models } from "mongoose";
import { ICart, ICartItem, ModifierSelection } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* menu selection alt şemalar */
const ModifierSelectionSchema = new Schema<ModifierSelection>(
  {
    groupCode: { type: String, required: true, trim: true },
    optionCode: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const MenuSnapshotSchema = new Schema(
  {
    name: { type: Object },
    variantName: { type: Object },
    sizeLabel: { type: Object },
    image: { type: String },
    allergens: [{ key: String, value: Object }],
    additives: [{ key: String, value: Object }],
    dietary: {
      vegetarian: Boolean,
      vegan: Boolean,
      containsAlcohol: Boolean,
      spicyLevel: Number,
    },
  },
  { _id: false }
);

const MenuSelectionSchema = new Schema(
  {
    variantCode: { type: String, trim: true },
    modifiers: { type: [ModifierSelectionSchema], default: [] },
    depositIncluded: { type: Boolean, default: true },
    notes: { type: String, trim: true },
    snapshot: { type: MenuSnapshotSchema },
  },
  { _id: false }
);

// 🛒 Sepet Ürün Alt Şeması
const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      refPath: "items.productType", // ⬅️ Mongoose, array alt yolunu kabul ediyor
      required: true,
    },
    productType: {
      type: String,
      enum: ["product", "ensotekprod", "sparepart", "menuitem"],
      required: true,
    },
    tenant: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    priceAtAddition: { type: Number, required: true, min: 0 },
    totalPriceAtAddition: { type: Number, required: true, default: 0, min: 0 },
    unitCurrency: { type: String },
    menu: { type: MenuSelectionSchema },
    priceComponents: { type: Schema.Types.Mixed },
  },
  { _id: true } // ⬅️ ÇOK ÖNEMLİ: lineId kullanıyoruz, _id olmalı
);

// 🛒 Ana Sepet Şeması
const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: "user", required: true },
    tenant: { type: String, required: true, index: true },
    items: { type: [cartItemSchema], default: [] },

    totalPrice: { type: Number, required: true, default: 0, min: 0 },

    currency: { type: String, default: "TRY" },
    tipAmount: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },

    couponCode: { type: String, default: null },
    status: {
      type: String,
      enum: ["open", "ordered", "cancelled"],
      default: "open",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    language: { type: String, enum: SUPPORTED_LOCALES, default: "en" },
  },
  { timestamps: true }
);

// 1 kullanıcı + tenant için tek açık sepet
cartSchema.index(
  { tenant: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: "open", isActive: true } }
);

// Basit güvenlik: save öncesi satır toplamını senkron tut
cartSchema.pre("save", function (next) {
  // @ts-ignore
  if (Array.isArray(this.items)) {
    // @ts-ignore
    this.totalPrice = this.items.reduce(
      (sum: number, it: ICartItem) => sum + Number(it.quantity || 0) * Number(it.priceAtAddition || 0),
      0
    );
  }
  next();
});

const Cart: Model<ICart> = models.cart || model<ICart>("cart", cartSchema);
export { Cart };
