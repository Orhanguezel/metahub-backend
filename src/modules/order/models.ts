import { Schema, model, models, Types, Model } from "mongoose";
import type {
  IOrder, IOrderItem, IShippingAddress,
  IOrderMenuSelection, IPriceComponents
} from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

/* --- Subschemas --- */

const priceComponentsSchema = new Schema<IPriceComponents>({
  base: { type: Number, required: true, min: 0 },
  deposit: { type: Number, min: 0, default: 0 },
  modifiersTotal: { type: Number, required: true, min: 0 },
  modifiers: [{
    code: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  }],
  currency: { type: String, required: true, trim: true, default: "TRY" }
}, { _id: false });

const orderMenuSelectionSchema = new Schema<IOrderMenuSelection>({
  // variantCode opsiyonel (BE default/tek varyant seçebilir)
  variantCode: { type: String, trim: true },
  modifiers: [{
    groupCode: { type: String, required: true, trim: true },
    optionCode: { type: String, required: true, trim: true },
    quantity: { type: Number, min: 1, default: 1 }
  }],
  notes: { type: String, trim: true },
  depositIncluded: { type: Boolean, default: true },
  snapshot: {
    name: { type: Object },
    variantName: { type: Object },
    sizeLabel: { type: Object },
    image: { type: String, trim: true },
    allergens: [{ key: String, value: Object }],
    additives: [{ key: String, value: Object }],
    dietary: {
      vegetarian: Boolean,
      vegan: Boolean,
      containsAlcohol: Boolean,
      spicyLevel: { type: Number, min: 0, max: 3 }
    }
  }
}, { _id: false });

const orderItemSchema = new Schema<IOrderItem>({
  product: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: "productType",
  },
  productType: {
    type: String,
    required: true,
    enum: ["bike", "ensotekprod", "sparepart", "menuitem"],
  },
  tenant: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 1 },

  // BE hesaplar (menuitem için) — 0 olabilir ama prefer > 0
  unitPrice: { type: Number, required: true, min: 0 },
  unitCurrency: { type: String, trim: true, default: "TRY" },

  // Satır eklenirken yakalanan fiyatlar (FE fallback’i için)
  priceAtAddition: { type: Number, min: 0, default: 0 },
  totalPriceAtAddition: { type: Number, min: 0, default: 0 },

  menu: { type: orderMenuSelectionSchema },
  priceComponents: { type: priceComponentsSchema },
}, { _id: false });

const shippingAddressSchema = new Schema<IShippingAddress>({
  name: { type: String, required: true, trim: true },
  tenant: { type: String, required: true, index: true },
  phone: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },

  // opsiyonel alanlar
  addressLine: { type: String, trim: true },
  houseNumber: { type: String, trim: true },

}, { _id: false });

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: "user", required: true },
  tenant: { type: String, required: true, index: true },

  serviceType: { type: String, enum: ["delivery","pickup","dinein"], default: "delivery" },
  branch: { type: Schema.Types.ObjectId, ref: "branch" },
  tableNo: { type: String, trim: true },

  addressId: { type: Schema.Types.ObjectId, ref: "address" },
  shippingAddress: { type: shippingAddressSchema, required: false },

  items: {
    type: [orderItemSchema],
    required: true,
    validate: [(v: any[]) => v.length > 0, "Order must have at least one item."],
  },

  currency: { type: String, trim: true, default: "TRY" },
  subtotal: { type: Number, required: true, min: 0 },
  deliveryFee: { type: Number, default: 0, min: 0 },
  tipAmount: { type: Number, default: 0, min: 0 },
  serviceFee: { type: Number, default: 0, min: 0 },
  taxTotal: { type: Number, default: 0, min: 0 },
  finalTotal: { type: Number, required: true, min: 0 },

  discount: { type: Number, default: 0, min: 0 },
  coupon: { type: Schema.Types.ObjectId, ref: "coupon" },

  paymentMethod: { type: String, enum: ["cash_on_delivery","credit_card","paypal"], default: "cash_on_delivery", required: true },
  payments: [{ type: Schema.Types.ObjectId, ref: "payment" }],

  status: { type: String, enum: ["pending","preparing","shipped","completed","cancelled"], default: "pending", required: true },

  language: { type: String, enum: SUPPORTED_LOCALES, default: "en" },
  isDelivered: { type: Boolean, default: false },
  isPaid: { type: Boolean, default: false },
  deliveredAt: { type: Date },
}, { timestamps: true });

/* Indexler */
orderSchema.index({ tenant: 1, createdAt: -1 });
orderSchema.index({ tenant: 1, serviceType: 1, status: 1 });
orderSchema.index({ tenant: 1, branch: 1, createdAt: -1 });

export const Order: Model<IOrder> = (models.order as Model<IOrder>) || model<IOrder>("order", orderSchema);
