import mongoose, { Schema, Document, Model, Types } from "mongoose";

// 🔹 Alt model: Extra
export interface ICustomExtra {
  label: {
    tr: string;
    en: string;
    de: string;
  };
  price: number;
}

// 🔹 Ana model: CustomPizza
export interface ICustomPizza extends Document {
  size: "klein" | "mittel" | "groß";
  base: {
    tr: string;
    en: string;
    de: string;
  };
  sauce: {
    tr: string;
    en: string;
    de: string;
  };
  toppings: {
    tr: string;
    en: string;
    de: string;
  }[];
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

// 🔸 Ana schema
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

const CustomPizza: Model<ICustomPizza> = mongoose.models.CustomPizza || mongoose.model<ICustomPizza>("CustomPizza", customPizzaSchema);
export default CustomPizza;

