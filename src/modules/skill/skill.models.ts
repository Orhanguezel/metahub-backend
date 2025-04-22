import { Schema, model, Document } from "mongoose";

export interface ISkill extends Document {
  category: string;
  name: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

const skillSchema = new Schema<ISkill>(
  {
    category: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

export default model<ISkill>("Skill", skillSchema);
