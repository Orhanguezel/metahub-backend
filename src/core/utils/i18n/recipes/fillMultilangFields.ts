// src/core/utils/i18n/fillMultilangFields.ts
import { fillAllLocales } from "./fillAllLocales";

export function fillMultilangFields(obj: any, fields: string[]) {
  for (const field of fields) {
    if (obj[field]) obj[field] = fillAllLocales(obj[field]);
  }
  return obj;
}
