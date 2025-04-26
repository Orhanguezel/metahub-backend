import mongoose from "mongoose";

const GuezelSchema = new mongoose.Schema({
  name: { type: String, required: true },
}, { timestamps: true });

export const Guezel = mongoose.model("Guezel", GuezelSchema);