import type { Document, Types } from "mongoose";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface IReview extends Document {
  tenant: string;
  product: Types.ObjectId;
  user?: Types.ObjectId;        // optional: misafir yorum desteklenebilir
  rating: number;               // 1..5
  title?: string;
  content?: string;
  images?: string[];
  status: ReviewStatus;         // default: pending
  likes: number;                // sayısal metrikler
  dislikes: number;

  createdAt?: Date;
  updatedAt?: Date;
}

/** Listeleme için basit DTO */
export interface ReviewListQuery {
  product?: string;
  status?: ReviewStatus;
  user?: string;
  q?: string;
  minRating?: number;
  maxRating?: number;
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest" | "rating_desc" | "rating_asc" | "helpful";
}

/** Public create input (body) */
export interface ReviewCreateInput {
  product: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
}

/** Admin update input (body) */
export interface ReviewUpdateInput {
  rating?: number;
  title?: string;
  content?: string;
  images?: string[];
  status?: ReviewStatus;
}
