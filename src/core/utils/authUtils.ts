// src/utils/authUtils.ts
import * as bcrypt from "bcrypt";


const saltRounds = parseInt(process.env.SALT_ROUNDS || "10", 10);


export const hashPassword = async (plainPassword: string): Promise<string> => {
  const salt = await bcrypt.genSalt(saltRounds);
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
  return /^\$2[aby]?\$\d{2}\$/.test(password);
};
