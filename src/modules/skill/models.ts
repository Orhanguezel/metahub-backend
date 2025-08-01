import { Schema, Model, Types, models, model } from "mongoose";
import type { ISkill, ISkillImage } from "./types";
import { SUPPORTED_LOCALES } from "@/types/common";

// 🔤 Çok dilli alan tipi tanımı
const localizedStringField = () => {
  const fields: Record<string, any> = {};
  for (const locale of SUPPORTED_LOCALES) {
    fields[locale] = { type: String, trim: true };
  }
  return fields;
};

const SkillImageSchema = new Schema<ISkillImage>(
  {
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    webp: { type: String },
    publicId: { type: String },
  },
  { _id: false }
);

const SkillSchema = new Schema<ISkill>(
  {
    title: localizedStringField(),
    tenant: { type: String, required: true, index: true },
    summary: localizedStringField(),
    content: localizedStringField(),
    slug: { type: String, required: true, unique: true, lowercase: true },
    images: { type: [SkillImageSchema], default: [] },
    tags: { type: [String], default: [] },
    author: { type: String },
    category: {
      type: Schema.Types.ObjectId,
      ref: "skillcategory",
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    comments: { type: [Schema.Types.ObjectId], ref: "comment", default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false }
);

SkillSchema.pre("validate", function (next) {
  if (!Array.isArray(this.images)) this.images = [];
  if (!Array.isArray(this.tags)) this.tags = [];
  if (!Array.isArray(this.comments)) this.comments = [];
  if (!this.slug && this.title?.en) {
    this.slug = this.title.en
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});


const Skill: Model<ISkill> =
  models.skill || model<ISkill>("skill", SkillSchema);

export { Skill, SkillImageSchema, SkillSchema };
