
  import mongoose from "mongoose";
  
  const RadoslavaSchema = new mongoose.Schema({
    name: { type: String, required: true },
  }, { timestamps: true });
  
  export const Radoslava = mongoose.model("Radoslava", RadoslavaSchema);
  