import { Types } from "mongoose";

export interface ISportImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
}

export interface ISport {
  title: {
    tr?: string;
    en?: string;
    de?: string;
  };
  slug: string;
  summary?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  content?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  images: ISportImage[];
  tags?: string[];
  author?: string;
  category?: Types.ObjectId; 
  isPublished: boolean;
  publishedAt?: Date;
  comments?: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
