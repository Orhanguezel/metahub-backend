import {Setting} from "@/modules/setting";

export const getSettingValue = async (
  key: string,
  language: "tr" | "en" | "de" = "en"
): Promise<string | null> => {
  const setting = await Setting.findOne({ key, isActive: true });

  if (!setting) {
    return null;
  }

  const value =
    setting.value?.[language] ||
    setting.value?.en ||
    setting.value?.tr ||
    setting.value?.de ||
    null;

  return value;
};
