// models/newsletter.model.ts
import { Schema, model, models, Model } from "mongoose";
import type { INewsletter } from "./types";

const NewsletterSchema = new Schema<INewsletter>(
  {
    tenant: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    verified: { type: Boolean, default: false },
    subscribeDate: { type: Date, default: Date.now },
    unsubscribeDate: { type: Date },
    lang: { type: String },
    meta: { type: Object },
  },
  { timestamps: true }
);

const Newsletter: Model<INewsletter> =
  models.Newsletter ||
  model<INewsletter>("newsletter", NewsletterSchema);

export { Newsletter };
