// backend/modules/recipes/i18n/index.ts (veya ilgili dizin)
import tr from "./tr.json";
import en from "./en.json";
import fr from "./fr.json";
import de from "./de.json";
import it from "./it.json";
import pt from "./pt.json";
import ar from "./ar.json";
import ru from "./ru.json";
import zh from "./zh.json"; // 简体中文
import hi from "./hi.json";

import type { SupportedLocale } from "@/types/recipes/common";

const translations: Record<SupportedLocale, any> = {
  tr,
  en,
  fr,
  de,
  it,
  pt,
  ar,
  ru,
  zh,
  hi,
};

export default translations;
