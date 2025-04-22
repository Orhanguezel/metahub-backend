// src/models/customPizza.models.ts

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// 🔹 Alt model: Extra
export interface ICustomExtra {
  name: string;
  price: number;
}

// 🔹 Ana model: CustomPizza
export interface ICustomPizza extends Document {
  size: "klein" | "mittel" | "groß";
  base: string;
  sauce: string;
  toppings: string[];
  extras?: ICustomExtra[];           // 💡 dizi olarak tanımlandı
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
    name: { type: String, required: true },
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
    base: { type: String, required: true },
    sauce: { type: String, required: true },
    toppings: [{ type: String, required: true }],

    extras: [customExtraSchema], // 💡 şimdi bir dizi olarak net

    note: { type: String },
    totalPrice: { type: Number, required: true },

    user: { type: Schema.Types.ObjectId, ref: "User" },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
  },
  { timestamps: true }
);

// 🔸 Model export
const CustomPizza: Model<ICustomPizza> = mongoose.model<ICustomPizza>("CustomPizza", customPizzaSchema);
export default CustomPizza;
