// src/modules/custompizza/custompizza.models.ts
import { Schema, model, Document, Model, models, Types } from "mongoose";

// 🔹 Extra type
interface ICustomExtra {
  label: {
    tr: string;
    en: string;
    de: string;
  };
  price: number;
}

// 🔹 CustomPizza type
interface ICustomPizza extends Document {
  size: "klein" | "mittel" | "groß";
  base: { tr: string; en: string; de: string };
  sauce: { tr: string; en: string; de: string };
  toppings: { tr: string; en: string; de: string }[];
  extras?: ICustomExtra[];
  note?: string;
  totalPrice: number;
  user?: Types.ObjectId;
  order?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// 🔸 Extra subschema
const customExtraSchema = new Schema<ICustomExtra>(
  {
    label: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    price: { type: Number, required: true },
  },
  { _id: false }
);

// 🔸 Main schema
const customPizzaSchema = new Schema<ICustomPizza>(
  {
    size: {
      type: String,
      enum: ["klein", "mittel", "groß"],
      required: true,
    },
    base: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    sauce: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    toppings: [
      {
        tr: { type: String, required: true },
        en: { type: String, required: true },
        de: { type: String, required: true },
      },
    ],
    extras: [customExtraSchema],
    note: { type: String },
    totalPrice: { type: Number, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
  },
  { timestamps: true }
);

// ✅ Guard + Model Type (This module has been updated and is now standardized)
const CustomPizza: Model<ICustomPizza> =
  models.CustomPizza || model<ICustomPizza>("CustomPizza", customPizzaSchema);

export default CustomPizza;
export type { ICustomPizza, ICustomExtra };
