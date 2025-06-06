import { Schema, model, Document, models, Model } from "mongoose";

export interface ISkill extends Document {
  category: {
    tr: string;
    en: string;
    de: string;
  };
  name: {
    tr: string;
    en: string;
    de: string;
  };
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

const skillSchema = new Schema<ISkill>(
  {
    category: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    name: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

const Skill: Model<ISkill> =
  models.Skill || model<ISkill>("Skill", skillSchema);

export default Skill;
export { Skill };
