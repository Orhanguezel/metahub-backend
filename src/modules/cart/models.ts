import { Schema, model, Types, Model, models } from "mongoose";
import { ICart, ICartItem, ModifierSelection } from "@/modules/cart/types";
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
      refPath: "items.productType",
      required: true,
    },
    productType: {
      type: String,
      enum: ["bike", "ensotekprod", "sparepart", "menuitem"],
      required: true,
    },
    tenant: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    priceAtAddition: { type: Number, required: true, min: 0 },
    totalPriceAtAddition: { type: Number, required: true, default: 0, min: 0 },
    unitCurrency: { type: String }, // opsiyonel
    menu: { type: MenuSelectionSchema }, // sadece menuitem
    priceComponents: { type: Schema.Types.Mixed }, // opsiyonel
  },
  { _id: false }
);

// 🛒 Ana Sepet Şeması
const cartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: "user", required: true },
    tenant: { type: String, required: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    totalPrice: { type: Number, required: true, default: 0, min: 0 },
    couponCode: { type: String, default: null },
    status: {
      type: String,
      enum: ["open", "ordered", "cancelled"],
      default: "open",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    discount: { type: Number, default: 0, min: 0 },
    language: { type: String, enum: SUPPORTED_LOCALES, default: "en" },
  },
  { timestamps: true }
);

// 🛒 Model Guard
const Cart: Model<ICart> = models.cart || model<ICart>("cart", cartSchema);
export { Cart };
