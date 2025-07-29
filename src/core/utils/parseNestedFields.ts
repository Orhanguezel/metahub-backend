// src/core/utils/parseNestedFields.ts

/**
 * form-data ile gelen dot notation alanları nested objeye çevirir:
 *  bankDetails.bankName -> { bankDetails: { bankName: ... } }
 */
export function parseNestedFields(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  // Her key için:
  for (const key of Object.keys(obj)) {
    if (key.includes(".")) {
      const [parent, child] = key.split(".");
      obj[parent] = obj[parent] || {};
      obj[parent][child] = obj[key];
      delete obj[key];
    }
  }
  return obj;
}
