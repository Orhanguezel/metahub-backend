// src/services/authService.ts
import { Response } from "express";
import { generateToken } from "../core/utils/token";
import { setTokenCookie, clearTokenCookie } from "../core/utils/cookie";
import { comparePasswords, hashPassword } from "../core/utils/authUtils";

export const loginAndSetToken = async (
  res: Response,
  userId: string,
  role: string
): Promise<string> => {
  const token = generateToken({ id: userId, role });
  setTokenCookie(res, token);
  return token;
};

export const logoutAndClearToken = (res: Response) => {
  clearTokenCookie(res);
};

export const checkPassword = async (
  inputPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return comparePasswords(inputPassword, hashedPassword);
};

export const hashNewPassword = async (password: string): Promise<string> => {
  return hashPassword(password);
};

