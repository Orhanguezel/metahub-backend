// src/scripts/section/seedAllSectionMeta.ts
import { SectionMeta } from "@/modules/section/section.models";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import sectionMetaSeedRaw from "./sectionMetaSeed.json";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n"; // 6 dilli dosya
import { SupportedLocale } from "@/types/common";
import { ISectionMeta } from "@/modules/section";

// 1️⃣ Gerekirse eksik locale otomatik doldur
const sectionMetaSeed = sectionMetaSeedRaw as unknown as Partial<ISectionMeta>[];

sectionMetaSeed.forEach((s) => {
  if (s.label) s.label = fillAllLocales(s.label);
  if (s.description) s.description = fillAllLocales(s.description);
  if (!("required" in s)) s.required = false;
  if (!("params" in s)) s.params = {};
  if (!("defaultEnabled" in s)) s.defaultEnabled = true;
  if (!("defaultOrder" in s)) s.defaultOrder = 9999;
});

// 2️⃣ Seed fonksiyonu
async function seedAllSectionMeta() {
  let created = 0;
  let updated = 0;

  for (const section of sectionMetaSeed) {
    const existing = await SectionMeta.findOne({ key: section.key });
    // Çoklu dil log için ana dil seç, ör: tr
    const locale: SupportedLocale = "tr";

    if (existing) {
      await SectionMeta.updateOne({ key: section.key }, { $set: section });
      logger.info(
        t("sync.sectionMetaUpdated", locale, translations, { key: section.key }),
        { module: "seedAllSectionMeta", event: "sectionMeta.updated", status: "success", key: section.key }
      );
      updated++;
    } else {
      await SectionMeta.create(section);
      logger.info(
        t("sync.sectionMetaCreated", locale, translations, { key: section.key }),
        { module: "seedAllSectionMeta", event: "sectionMeta.created", status: "success", key: section.key }
      );
      created++;
    }
  }

  // Sadece bilgilendirici log (opsiyonel, çoklu dil)
  logger.info(
    t("sync.sectionMetaSummary", "tr", translations, { created, updated }),
    { module: "seedAllSectionMeta", event: "sectionMeta.summary", created, updated }
  );

  // Eğer ortam standalone ise disconnect:
  // await mongoose.disconnect();
  // console.log("SectionMeta seed işlemi tamamlandı.");
}


export { seedAllSectionMeta };
