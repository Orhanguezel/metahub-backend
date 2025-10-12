// src/core/middleware/auth/token.ts

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "❌ JWT_SECRET is not defined in your environment configuration."
  );
}

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

export const verifyToken = (token: string): { id: string; role: string } => {
  return jwt.verify(token, JWT_SECRET) as { id: string; role: string };
};
