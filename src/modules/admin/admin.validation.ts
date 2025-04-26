// src/modules/admin/admin.validation.ts
import { z } from "zod";

export const updateModuleSchema = z.object({
  project: z.string(),
  enabled: z.boolean().optional(), 
  visibleInSidebar: z.boolean().optional(),
  useAnalytics: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
  icon: z.string().optional(),
  label: z
    .object({
      tr: z.string(),
      en: z.string(),
      de: z.string(),
    })
    .optional(),
});
