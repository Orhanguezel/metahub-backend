import mongoose from "mongoose";
import { Response } from "express";

/**
 * ✅ ObjectId geçerlilik kontrolü
 */
export const isValidObjectId = (id: any): boolean => {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id.trim());
};

/**
 * ✅ Kullanıcıyı getir, bulunmazsa çok dilli 404 döner
 */
export const getUserOrFail = async (id: string, res: Response) => {
  const user = await import("../../modules/users/users.models").then((mod) =>
    mod.default.findById(id.trim())
  );
  if (!user) {
    res.status(404).json({
      success: false,
      message:
        res.locals?.locale === "de"
          ? "Benutzer nicht gefunden."
          : res.locals?.locale === "tr"
          ? "Kullanıcı bulunamadı."
          : "User not found.",
    });
    return null;
  }
  return user;
};

/**
 * ✅ Geçerli rol kontrolü
 */
export const isValidRole = (role: string): boolean => {
  const validRoles = ["admin", "user", "moderator", "customer", "staff"];
  return validRoles.includes(role);
};

/**
 * ✅ E-posta format kontrolü (regex ile)
 */
export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * ✅ JSON parse edilebilir mi kontrolü
 */
export const validateJsonField = (field: any, fieldName: string): any => {
  try {
    return typeof field === "string" ? JSON.parse(field) : field;
  } catch {
    throw new Error(`Invalid JSON format for '${fieldName}'`);
  }
};
