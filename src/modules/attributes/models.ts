import { Schema, model, models, type Model } from "mongoose";

export type AttributeType = "text" | "select" | "color" | "size";

/** === Inputs (DTO) === */
export interface AttributeValueInput {
  code: string;                         // "BLACK", "XL"
  label?: Record<string, string>;       // { tr: "Siyah", en: "Black" }
  hex?: string;                         // "#000000"
  sort?: number;
  isActive?: boolean;
}

export interface CreateProductAttributeInput {
  code: string;                         // "COLOR"
  name: Record<string, string>;         // { tr: "Renk", en: "Color" }
  type?: AttributeType;                 // default "select"
  values?: AttributeValueInput[];
  isActive?: boolean;                   // default true
  group?: string;                       // ← eklendi
  sort?: number;                        // ← eklendi (tepe düzey)
}

export interface UpdateProductAttributeInput {
  code?: string;
  name?: Record<string, string>;
  type?: AttributeType;
  values?: AttributeValueInput[];       // tamamını replace eder
  isActive?: boolean;
  group?: string;                       // ← eklendi
  sort?: number;                        // ← eklendi
}

export interface AttributeListQuery {
  q?: string;                           // code, name[lang], values.code, values.label[lang]
  lang?: string;                        // default "tr"
  type?: AttributeType;
  isActive?: boolean;
  group?: string;                       // ← eklendi
  limit?: number;                       // default 200
  sort?: "code_asc" | "code_desc" | "created_desc" | "created_asc" | "sort_asc" | "sort_desc"; // ← eklendi
}

/** === Persisted === */
export interface IAttributeValue {
  code: string;                   // "BLACK", "XL"
  label: Map<string, string>;     // i18n
  hex?: string;                   // color için
  sort?: number;
  isActive?: boolean;
}

export interface IProductAttribute {
  tenant: string;
  code: string;                   // "COLOR"
  name: Map<string, string>;      // i18n
  type: AttributeType;
  values: IAttributeValue[];
  isActive: boolean;

  // yeni alanlar
  group?: string;                 // gruplama (örn. "Genel", "Teknik")
  sort?: number;                  // listelerde üst düzey sıralama

  createdAt?: Date;
  updatedAt?: Date;
}

const ValueSchema = new Schema<IAttributeValue>({
  code: { type: String, required: true, uppercase: true, trim: true },
  label: { type: Map, of: String, default: {} },
  hex: String,
  sort: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const AttributeSchema = new Schema<IProductAttribute>({
  tenant: { type: String, index: true, required: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: Map, of: String, default: {} },
  type: { type: String, enum: ["text","select","color","size"], default: "select" },
  values: { type: [ValueSchema], default: [] },
  isActive: { type: Boolean, default: true },

  // yeni
  group: { type: String, trim: true, index: true },
  sort: { type: Number, default: 0, index: true },
}, { timestamps: true });

AttributeSchema.index({ tenant: 1, code: 1 }, { unique: true });
AttributeSchema.index({ tenant: 1, group: 1, sort: 1 });

AttributeSchema.set("toJSON", {
  transform: (_doc, ret) => {
    if (ret?.name instanceof Map) ret.name = Object.fromEntries(ret.name);
    if (Array.isArray(ret?.values)) {
      ret.values = ret.values.map((v: any) =>
        v?.label instanceof Map ? { ...v, label: Object.fromEntries(v.label) } : v
      );
    }
    return ret;
  },
});

export const ProductAttribute: Model<IProductAttribute> =
  models.productattribute || model<IProductAttribute>("productattribute", AttributeSchema);

export default ProductAttribute;
