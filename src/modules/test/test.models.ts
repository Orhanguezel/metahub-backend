import mongoose from "mongoose";

const TestSchema = new mongoose.Schema({
  name: { type: String, required: true },
}, { timestamps: true });

export const Test = mongoose.model("Test", TestSchema);