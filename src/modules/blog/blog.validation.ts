// src/modules/blog/blog.validation.ts
import { z } from "zod";

export const BlogCreateSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10),
  author: z.string().min(2),
  published: z.boolean().default(false),
});
