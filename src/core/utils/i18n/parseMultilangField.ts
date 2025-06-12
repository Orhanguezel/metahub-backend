// src/core/utils/i18n/parseMultilangField.ts
import { fillAllLocales } from "./fillAllLocales";

// Tek alan: label, description vs.
export function parseMultilangField(input: any) {
  return fillAllLocales(input);
}

// Çoklu alan: { label, description, ... }
export function fillFields(obj: any, fields: string[]) {
  for (const field of fields) {
    if (obj[field]) obj[field] = fillAllLocales(obj[field]);
  }
  return obj;
}
