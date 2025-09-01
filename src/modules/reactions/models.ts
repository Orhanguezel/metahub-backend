import { Schema, model, models, type Model } from "mongoose";
import type { IReaction, ReactionKind } from "./types";

const ReactionSchema = new Schema<IReaction>(
  {
    tenant: { type: String, required: true, index: true, trim: true },
    user:   { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },

    kind: {
      type: String,
      required: true,
      enum: ["LIKE", "FAVORITE", "BOOKMARK", "EMOJI", "RATING"] satisfies ReactionKind[],
      index: true,
    },

    emoji: { type: String, trim: true, default: null },

    // RATING değeri
    value: { type: Number, min: 1, max: 5, default: null, index: true },

    targetType: { type: String, required: true, index: true, trim: true },
    targetId:   { type: Schema.Types.ObjectId, required: true, index: true },

    extra:    { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, minimize: false }
);

/* ----- Indexes ----- */
// Kullanıcı aynı hedefe aynı tür (ve EMOJI ise aynı emoji) en fazla 1 kayıt.
ReactionSchema.index(
  { tenant: 1, user: 1, targetType: 1, targetId: 1, kind: 1, emoji: 1 },
  { unique: true, name: "uniq_user_target_kind_emoji" }
);

// RATING için kullanıcı–hedef başına tek kayıt
ReactionSchema.index(
  { tenant: 1, user: 1, targetType: 1, targetId: 1, kind: 1 },
  { unique: true, name: "uniq_user_target_rating", partialFilterExpression: { kind: "RATING" } }
);

// Sayım/özet sorguları için yardımcı
ReactionSchema.index({ tenant: 1, targetType: 1, targetId: 1, kind: 1, emoji: 1, value: 1 });

/* ----- Hooks / Validations ----- */
ReactionSchema.pre("validate", function (next) {
  if (this.kind === "EMOJI") {
    if (!this.emoji || String(this.emoji).trim().length === 0) {
      return next(new Error("emoji_required_for_kind_emoji"));
    }
    this.value = null;
  } else if (this.kind === "RATING") {
    this.emoji = null;
    if (!(Number.isFinite(this.value) && (this.value as number) >= 1 && (this.value as number) <= 5)) {
      return next(new Error("rating_value_out_of_range"));
    }
  } else {
    this.emoji = null;
    this.value = null;
  }
  next();
});

export const Reaction: Model<IReaction> =
  models.reaction || model<IReaction>("reaction", ReactionSchema);
