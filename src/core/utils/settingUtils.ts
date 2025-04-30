import { Setting } from "@/modules/setting";

export const getSettingValue = async (
  key: string,
  language: "tr" | "en" | "de" = "en"
): Promise<string | null> => {
  const setting = await Setting.findOne({ key, isActive: true });

  if (!setting || !setting.value) return null;

  const value = setting.value;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    // Eğer array ise: bu setting normal bir çeviri değil, örneğin available_themes gibi
    return value.length > 0 ? value[0] : null;
  }

  if (typeof value === "object") {
    return (
      value[language] ||
      value.en ||
      value.tr ||
      value.de ||
      null
    );
  }

  return null;
};

