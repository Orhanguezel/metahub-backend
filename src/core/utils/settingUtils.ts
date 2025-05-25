import { Setting } from "@/modules/setting";

// Çeviri value’sunu ayıklayan güvenli yardımcı fonksiyon
function extractMultiLangValue(obj: any, lang: "tr" | "en" | "de") {
  // Tüm dillerin key olarak olduğu klasik çeviri obje kontrolü
  if (
    typeof obj === "object" &&
    obj !== null &&
    "tr" in obj &&
    "en" in obj &&
    "de" in obj
  ) {
    return obj[lang] || obj.en || obj.tr || obj.de || null;
  }
  return null;
}

export const getSettingValue = async (
  key: string,
  language: "tr" | "en" | "de" = "en"
): Promise<string | null> => {
  const setting = await Setting.findOne({ key, isActive: true });

  if (!setting || !setting.value) {
    console.warn(`[getSettingValue] Setting key "${key}" not found or inactive.`);
    return null;
  }

  const value = setting.value;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    // Örn: available_themes gibi
    return value.length > 0 ? value[0] : null;
  }

  // Çeviri value’su ise
  const multiLang = extractMultiLangValue(value, language);
  if (multiLang) return multiLang;

  // Eğer logo ayarı ise (navbar_logos, footer_logos)
  if (
    typeof value === "object" &&
    (key === "navbar_logos" || key === "footer_logos")
  ) {
    // light ve dark için ayrı ayrı path döndür (veya başka mantık)
    // Örnek:
    return JSON.stringify(value); // ya da frontende raw object dönebilirsin
  }

  // Diğer object value’larda generic fallback
  return null;
};
