// src/utils/authUtils.ts
import * as bcrypt from "bcrypt";

export const hashPassword = async (plainPassword: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

export const comparePasswords = async (
  inputPassword?: string,
  hashedPassword?: string
): Promise<boolean> => {
  if (!inputPassword || !hashedPassword) return false;
  return bcrypt.compare(inputPassword, hashedPassword);
};

export const isPasswordHashed = (password: string): boolean => {
  return password.startsWith("$2b$10$"); // bcrypt hash prefix
};

