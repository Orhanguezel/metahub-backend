import mongoose from "mongoose";

const OrhanSchema = new mongoose.Schema({
  name: { type: String, required: true },
}, { timestamps: true });

export const Orhan = mongoose.model("Orhan", OrhanSchema);
