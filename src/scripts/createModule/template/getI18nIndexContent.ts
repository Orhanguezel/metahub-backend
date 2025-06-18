export const getI18nIndexContent = () => `
import tr from "./tr.json";
import en from "./en.json";
import de from "./de.json";
import pl from "./pl.json";
import fr from "./fr.json";
import es from "./es.json";
import type { SupportedLocale } from "@/types/common";

const translations: Record<SupportedLocale, any> = { tr, en, de, pl, fr, es };

export default translations;
`;
