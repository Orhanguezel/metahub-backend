// src/utils/validation.ts

import mongoose from "mongoose";
import { Response } from "express";

// ✅ ObjectId geçerlilik kontrolü
export const isValidObjectId = (id: any): boolean => {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id.trim());
};

// ✅ Kullanıcıyı getir, bulunmazsa 404 döner
export const getUserOrFail = async (id: string, res: Response) => {
  const user = await import("../modules/user/user.models").then((mod) =>
    mod.default.findById(id.trim())
  );
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return null;
  }
  return user;
};

// ✅ Geçerli rol kontrolü
export const isValidRole = (role: string): boolean => {
  const validRoles = ["admin", "user", "moderator", "customer", "staff"];
  return validRoles.includes(role);
};

// ✅ E-posta format kontrolü (regex ile basit kontrol)
export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✅ JSON alanı doğru parse edilebiliyor mu kontrolü (bozulmaya karşı koruma)
export const validateJsonField = (field: any, fieldName: string): any => {
  try {
    return typeof field === "string" ? JSON.parse(field) : field;
  } catch {
    throw new Error(`Invalid JSON format for '${fieldName}'`);
  }
};
