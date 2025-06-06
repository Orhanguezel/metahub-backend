import { Types } from "mongoose";

// ✅ Image interface
export interface IRadonarProdImage {
  url: string;
  thumbnail: string;
  webp?: string;
  publicId?: string;
  altText?: {
    tr?: string;
    en?: string;
    de?: string;
  };
}

// ✅ Ana interface
export interface IRadonarProd {
  name: {
    tr?: string;
    en?: string;
    de?: string;
  };
  slug: string;
  description?: {
    tr?: string;
    en?: string;
    de?: string;
  };
  brand: string;
  price: number;
  stock: number;
  stockThreshold?: number;
  category: Types.ObjectId;
  tags?: string[];
  images: IRadonarProdImage[];
  frameMaterial?: string;
  brakeType?: string;
  wheelSize?: number;
  gearCount?: number;
  suspensionType?: string;
  color?: string[];
  weightKg?: number;
  isElectric?: boolean;
  batteryRangeKm?: number;
  motorPowerW?: number;
  comments?: Types.ObjectId[];
  likes?: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
