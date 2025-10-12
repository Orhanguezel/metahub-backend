// src/modules/product/userReport.model.ts
import { Schema, model, models, type Model } from "mongoose";

const UserReportSchema = new Schema(
  {
    tenant: { type: String, required: true, index: true },

    subjectType: { type: String, enum: ["product","review","seller","other"], required: true, index: true },
    subjectRef:  { type: Schema.Types.ObjectId, required: true, index: true },

    reason:  { type: String, enum: ["wrong_info","abuse","fraud","other"], required: true },
    details: { type: String },

    status: { type: String, enum: ["pending","reviewing","closed"], default: "pending", index: true },

    createdByRef: { type: Schema.Types.ObjectId, ref: "user" },
    contact: { name: String, email: String, phone: String },

    sessionId: String,
    ip: String,
    userAgent: String,

    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Sorgu performansı & spam sınırlaması için uygun index
UserReportSchema.index({ tenant: 1, subjectType: 1, subjectRef: 1, ip: 1, createdAt: -1 });


export const  UserReport: Model<any> =
  models.userreport || model<any>("userreport", UserReportSchema);

