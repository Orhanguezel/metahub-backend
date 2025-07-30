// models/catalogRequest.model.ts
import { Schema, model, Model, models } from "mongoose";
import type { ICatalogRequest } from "@/modules/catalog/types";

const CatalogRequestSchema = new Schema<ICatalogRequest>(
  {
    name: { type: String, required: true },
    tenant: { type: String, required: true, index: true },
    email: { type: String, required: true },
    phone: { type: String },
    company: { type: String },
    locale: { type: String, required: true }, // "en", "tr", "de" gibi
    catalogType: { type: String }, // "main", "bikes", "spareparts" gibi, ileride farklı kataloglar için!
    sentCatalog: {
      url: { type: String, required: false },
      fileName: { type: String },
      fileSize: { type: Number },
    },
    subject: { type: String, required: true }, // "Katalog Talebi" gibi
    message: { type: String },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const CatalogRequest: Model<ICatalogRequest> =
  models.catalogrequest || model<ICatalogRequest>("catalogrequest", CatalogRequestSchema);

export { CatalogRequest };
