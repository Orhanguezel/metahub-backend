import { Schema, model, Document } from "mongoose";

export interface ISocialMedia extends Document {
  platform: string;
  link: string;
  icon?: string;
  language?: "tr" | "en" | "de";
  createdAt: Date;
  updatedAt: Date;
}

const socialMediaSchema = new Schema<ISocialMedia>(
  {
    platform: { type: String, required: true, trim: true },
    link: { type: String, required: true, trim: true },
    icon: { type: String, trim: true },
    language: {
      type: String,
      enum: ["tr", "en", "de"],
      default: "en",
    },
  },
  { timestamps: true }
);

export default model<ISocialMedia>("SocialMedia", socialMediaSchema);
