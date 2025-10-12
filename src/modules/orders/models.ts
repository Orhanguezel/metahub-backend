import { Schema, model, models, Types, Model } from "mongoose";
import type {
  IOrder, IOrderItem, IShippingAddress,
  IOrderMenuSelection, IPriceComponents,
  IEmbeddedPayment, IEmbeddedShipment, IEmbeddedReturn, IEmbeddedRefund
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
    refPath: "productType", // Mongoose model adıyla eşleşmeli
  },
  productType: {
    type: String,
    required: true,
    enum: ["product", "ensotekprod", "sparepart", "menuitem"],
  },
  tenant: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 1 },

  unitPrice: { type: Number, required: true, min: 0 },
  unitCurrency: { type: String, trim: true, default: "TRY" },

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
  addressLine: { type: String, trim: true },
  houseNumber: { type: String, trim: true },
}, { _id: false });

/* --- Optional embed-first subs --- */
const embeddedPaymentSchema = new Schema<IEmbeddedPayment>({
  status: { type: String, enum: ["pending","authorized","paid","failed","refunded","cancelled"], default: "pending" },
  method: { type: String, enum: ["card","wallet","cash"], required: true, default: "cash" },
  provider: { type: String, trim: true },
  currency: { type: String, trim: true, default: "TRY" },
  amount: { type: Number, min: 0, default: 0 },
  externalId: { type: String, trim: true },               // genelleştirilmiş dış referans
  intentId:   { type: String, trim: true },               // Stripe PaymentIntent eşlemesi için
  createdAt: { type: Date },
  updatedAt: { type: Date },
  transactions: [{
    kind: { type: String, enum: ["auth","capture","refund","void"], required: true },
    amount: { type: Number, min: 0, required: true },
    at: { type: Date, required: true },
    ref: { type: String, trim: true }
  }]
}, { _id: false });

const embeddedShipmentSchema = new Schema<IEmbeddedShipment>({
  carrier: String,
  service: String,
  trackingNo: String,
  status: { type: String, enum: ["ready","shipped","in_transit","delivered","returned","cancelled"], default: "ready" },
  events: [{ at: Date, code: String, message: String, location: String }],
  createdAt: Date,
  updatedAt: Date,
}, { _id: false });

const embeddedReturnSchema = new Schema<IEmbeddedReturn>({
  reason: String,
  status: { type: String, enum: ["requested","approved","rejected","received","refunded"], default: "requested" },
  items: [{ product: { type: Schema.Types.ObjectId }, qty: { type: Number, min: 1 } }],
  createdAt: Date,
  updatedAt: Date,
}, { _id: false });

const embeddedRefundSchema = new Schema<IEmbeddedRefund>({
  amount: { type: Number, min: 0, required: true },
  currency: { type: String, trim: true, default: "TRY" },
  status: { type: String, enum: ["pending","succeeded","failed"], default: "pending" },
  method: { type: String, enum: ["card","wallet","manual"], default: "manual" },
  externalId: { type: String, trim: true },
  createdAt: Date,
  updatedAt: Date,
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

  /** embed-first opsiyoneller */
  payment: { type: embeddedPaymentSchema },
  shipments: { type: [embeddedShipmentSchema], default: [] },
  returns: { type: [embeddedReturnSchema], default: [] },
  refunds: { type: [embeddedRefundSchema], default: [] },

  /** mevcut projection alanları */
  paymentMethod: { type: String, enum: ["cash_on_delivery","credit_card","paypal"], default: "cash_on_delivery", required: true },
  paymentStatus: {
    type: String,
    enum: ["requires_payment","requires_action","processing","paid","failed","refunded"],
    default: "requires_payment",
    index: true
  },

  payments: [{ type: Schema.Types.ObjectId, ref: "payment" }],

  status: { type: String, enum: ["pending","preparing","shipped","completed","cancelled"], default: "pending", required: true },

  // --- yeni alanlar ---
  orderNo: { type: String, trim: true, index: true },
  idempotencyKey: { type: String, trim: true, select: false },
  idempotencyExpiresAt: { type: Date, default: undefined, select: false }, // TTL için
  reservedUntil: { type: Date },
  timeline: [{ at: Date, ev: String, by: String, meta: Schema.Types.Mixed }],

  // Snapshots
  couponSnapshot: {
    type: new Schema({ code: String, type: String, value: Number }, { _id: false }),
    default: undefined
  },
  shippingSnapshot: {
    type: new Schema({
      code: String,
      calc: Schema.Types.Mixed,
      price_cents: { type: Number, default: 0 }
    }, { _id: false }),
    default: undefined
  },

  // cents alanları (Pricing uyumu)
  subtotal_cents: { type: Number, min: 0, default: 0 },
  deliveryFee_cents: { type: Number, min: 0, default: 0 },
  tip_cents: { type: Number, min: 0, default: 0 },
  serviceFee_cents: { type: Number, min: 0, default: 0 },
  tax_cents: { type: Number, min: 0, default: 0 },
  discount_cents: { type: Number, min: 0, default: 0 },
  finalTotal_cents: { type: Number, min: 0, default: 0 },

  language: { type: String, enum: SUPPORTED_LOCALES, default: "en" },
  isDelivered: { type: Boolean, default: false },
  isPaid: { type: Boolean, default: false },
  deliveredAt: { type: Date },
}, { timestamps: true });

/* Indexler */
orderSchema.index({ tenant: 1, createdAt: -1 });
orderSchema.index({ tenant: 1, status: 1, createdAt: -1 });
orderSchema.index({ tenant: 1, serviceType: 1, status: 1 });
orderSchema.index({ tenant: 1, branch: 1, createdAt: -1 });

// Benzersiz idempotency per tenant
orderSchema.index({ tenant: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
// TTL: idempotency key’leri 1 saat sonra düşür (yalnız Date alanına TTL uygulanır)
orderSchema.index({ idempotencyExpiresAt: 1 }, { expireAfterSeconds: 0 });

// Sipariş numarası benzersiz (tenant bazında)
orderSchema.index({ tenant: 1, orderNo: 1 }, { unique: true, sparse: true });

// Webhook eşlemesi için intent index
orderSchema.index({ tenant: 1, "payment.intentId": 1 }, { sparse: true });

/* Hooks */
// Sipariş numarası üretimi (yoksa) — timestamp + base36
orderSchema.pre("validate", function(next) {
  if (!this.orderNo) {
    const d = new Date();
    const ts = [
      d.getFullYear(),
      String(d.getMonth()+1).padStart(2,"0"),
      String(d.getDate()).padStart(2,"0"),
      String(d.getHours()).padStart(2,"0"),
      String(d.getMinutes()).padStart(2,"0"),
    ].join("");
    const rnd = Math.random().toString(36).slice(2,7).toUpperCase();
    this.orderNo = `MH-${ts}-${rnd}`;
  }
  next();
});

// Idempotency TTL otomatik set
orderSchema.pre("save", function(next) {
  if (this.isModified("idempotencyKey") || (this as any).isNew) {
    if (this.idempotencyKey && !this.idempotencyExpiresAt) {
      const exp = new Date(Date.now() + 60 * 60 * 1000); // +1h
      this.idempotencyExpiresAt = exp as any;
    }
  }
  next();
});

export const Order: Model<IOrder> =
  (models.order as Model<IOrder>) || model<IOrder>("order", orderSchema);
