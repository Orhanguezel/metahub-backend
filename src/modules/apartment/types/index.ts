// 📁 modules/apartment/types/index.ts

import { Types } from "mongoose";

export interface IApartmentImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface IApartment {
  title: {
    tr?: string;
    en?: string;
    de?: string;
  };
  slug: string;
  description: {
    tr?: string;
    en?: string;
    de?: string;
  };
  address?: string;
  rooms?: number;
  price?: number;
  floor?: number;
  size?: number;
  tags?: string[];
  images?: IApartmentImage[];
  category?: Types.ObjectId;
  isPublished: boolean;
  publishedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
