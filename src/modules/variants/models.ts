import { Schema, model, models, type Model, type Types } from "mongoose";
import type { IProductVariant } from "./types";

/* ---------------- Helpers ---------------- */
const ISO4217 = /^[A-Z]{3}$/;

function buildOptionsKey(
  opts?: Map<string, string> | Record<string, string> | null
): string {
  const entries =
    opts instanceof Map
      ? Array.from(opts.entries())
      : Object.entries(opts || {});
  const key = entries
    .map(([k, v]) => `${String(k).trim().toUpperCase()}=${String(v).trim().toUpperCase()}`)
    .sort()
    .join("|");
  return key || "DEFAULT";
}

/* ---------- Extended Model (statics) --------- */
export interface IProductVariantModel extends Model<IProductVariant> {
  resolveByOptions(
    tenant: string,
    product: Types.ObjectId | string,
    options: Record<string, string>
  ): Promise<IProductVariant | null>;
}

/* ---------------- Schema ---------------- */
const VariantSchema = new Schema<IProductVariant, IProductVariantModel>(
  {
    tenant: { type: String, index: true, required: true, trim: true },

    // alias kullanmıyoruz, JSON transform’da productId ekleyeceğiz
    product: { type: Schema.Types.ObjectId, ref: "product", required: true, index: true },

    sku: { type: String, required: true, uppercase: true, trim: true },
    barcode: { type: String, trim: true },

    options: { type: Map, of: String, default: {} }, // orijinal-case sakla
    optionsKey: { type: String, required: true, index: true },

    // Product ile aynı tip (number). Para birimi Variant üzerinde tutulur (override edilebilir).
    price: { type: Number, required: true, min: [0, "variant.price.min"] },
    salePrice: { type: Number, min: [0, "variant.salePrice.min"] },
    currency: {
      type: String,
      default: "TRY",
      set(v: string) { return String(v || "TRY").toUpperCase(); },
      validate: {
        validator(v: string) { return ISO4217.test(String(v)); },
        message: "variant.currency.iso4217",
      },
    },

    stock: { type: Number, default: 0, min: [0, "variant.stock.min"], index: true },

    image: { type: String, trim: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Map → plain object
        if (ret?.options instanceof Map) ret.options = Object.fromEntries(ret.options);
        // FE/spec gereği productId alanını da verelim
        if (ret.product) ret.productId = String(ret.product);
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ---------------- Indexler ---------------- */
// Tenant içinde SKU tekil
VariantSchema.index({ tenant: 1, sku: 1 }, { unique: true, name: "uniq_tenant_sku" });
// Tenant + product + optionsKey tekil (aynı opsiyon kombinasyonu tekrarlanmaz)
VariantSchema.index(
  { tenant: 1, product: 1, optionsKey: 1 },
  { unique: true, name: "uniq_variant_by_options" }
);
// Listeleme/filtre hızlandırıcılar
VariantSchema.index({ tenant: 1, product: 1, isActive: 1, createdAt: -1 }, { name: "list_by_product" });
VariantSchema.index({ tenant: 1, price: 1 }, { name: "by_price" });
VariantSchema.index({ tenant: 1, stock: 1 }, { name: "by_stock" });
VariantSchema.index({ tenant: 1, barcode: 1 }, { name: "by_barcode" });

/* ---------------- Hooks ---------------- */
VariantSchema.pre("validate", function (next) {
  const anyThis = this as any;

  // optionsKey üretimi (orijinal-case’i sakla, anahtar normalize)
  anyThis.optionsKey = buildOptionsKey(anyThis.options);

  // salePrice > price olabilir; zorlamıyoruz. Negatifler zaten engelleniyor.
  // currency upper-case set ile normalize oluyor
  next();
});

/* ---------------- Statics ---------------- */
VariantSchema.statics.resolveByOptions = async function (
  tenant: string,
  product: Types.ObjectId | string,
  options: Record<string, string>
) {
  const optionsKey = buildOptionsKey(options);
  return this.findOne({ tenant, product, optionsKey }).lean();
};

/* ---------------- Model ---------------- */
export const ProductVariant = (models.productvariant as IProductVariantModel)
  || model<IProductVariant, IProductVariantModel>("productvariant", VariantSchema);

export default ProductVariant;
