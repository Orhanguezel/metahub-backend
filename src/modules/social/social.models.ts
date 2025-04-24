import { Schema, model, Document } from "mongoose";

export interface ISocialMedia extends Document {
  platform: {
    tr: string;
    en: string;
    de: string;
  };
  link: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const socialMediaSchema = new Schema<ISocialMedia>(
  {
    platform: {
      tr: { type: String, required: true },
      en: { type: String, required: true },
      de: { type: String, required: true },
    },
    link: { type: String, required: true, trim: true },
    icon: { type: String, trim: true },
  },
  { timestamps: true }
);

export default model<ISocialMedia>("SocialMedia", socialMediaSchema);
