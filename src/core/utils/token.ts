// src/utils/token.ts
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * JWT Token üretir
 */
export const generateToken = ({ id, role }: { id: string; role: string }): string => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" });
};

/**
 * JWT Token çözümler (verify)
 */
export const verifyToken = (token: string): { id: string; role: string } => {
  return jwt.verify(token, JWT_SECRET) as { id: string; role: string };
};
