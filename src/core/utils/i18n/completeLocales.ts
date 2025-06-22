import { SUPPORTED_LOCALES } from "@/types/common";

// Bir objeyi eksik dilleriyle otomatik tamamlar.
// 1. Öncelik "en", sonra sırasıyla ilk dolu olan.
// 2. Boşsa "" (empty string)
export function completeLocales(value: Record<string, any>): Record<string, any> {
  // Eğer hiç obje değilse dokunma
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  // Dolu diller
  const filled = SUPPORTED_LOCALES.filter(l => value[l] && value[l].trim());
  const primary = filled.includes("en") ? "en" : filled[0];

  // Eğer hiç dolu yoksa tümünü "" yap
  if (!primary) {
    return Object.fromEntries(SUPPORTED_LOCALES.map(l => [l, ""]));
  }

  // Eksik dilleri tamamla
  const result: Record<string, any> = { ...value };
  for (const lang of SUPPORTED_LOCALES) {
    if (!result[lang] || !result[lang].trim()) {
      result[lang] = value[primary];
    }
  }
  return result;
}
