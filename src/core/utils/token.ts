// src/core/utils/token.ts

import jwt from "jsonwebtoken";

// 🔐 Required environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not defined in your environment configuration.");
}

/**
 * Generates a signed JWT token using user ID and role.
 */
export const generateToken = ({
  id,
  role,
}: {
  id: string;
  role: string;
}): string => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * Verifies a JWT token and extracts its payload.
 */
export const verifyToken = (
  token: string
): { id: string; role: string } => {
  return jwt.verify(token, JWT_SECRET) as { id: string; role: string };
};
