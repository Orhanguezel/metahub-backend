import { Schema, model, Document, models, Model } from "mongoose";

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

const SocialMedia: Model<ISocialMedia> =
  models.SocialMedia || model<ISocialMedia>("SocialMedia", socialMediaSchema);

export default SocialMedia;
export { SocialMedia };
