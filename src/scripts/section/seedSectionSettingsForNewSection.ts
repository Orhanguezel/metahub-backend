import "@/core/config/envLoader";
import { SectionMeta } from "@/modules/section/section.models";
import { SectionSetting } from "@/modules/section/section.models";
import { Tenants } from "@/modules/tenants/tenants.model";
import logger from "@/core/middleware/logger/logger";
import { t } from "@/core/utils/i18n/translate";
import translations from "./i18n";

// --- Ayarlayacağın yeni section key burada! (örn: "about", "news", vs.)
const NEW_SECTION_KEY = "about";

// --- Varsayılan ayarlar. Gerekirse burada özelleştir.
const DEFAULT_SETTING = {
  roles: ["admin"],
};

async function seedSectionSettingsForNewSection() {
  // 1️⃣ Section meta’yı bul
  const meta = await SectionMeta.findOne({ key: NEW_SECTION_KEY });
  if (!meta) {
    console.error(`SectionMeta bulunamadı: ${NEW_SECTION_KEY}`);
    process.exit(1);
  }

  // 2️⃣ Tüm aktif tenant’ları bul
  const tenants = await Tenants.find({ isActive: true }, { slug: 1 }).lean();
  if (!tenants.length) {
    console.error("Hiç aktif tenant yok!");
    process.exit(1);
  }

  let createdCount = 0;

  // 3️⃣ Her tenant için SectionSetting oluştur (eğer yoksa)
  for (const tenant of tenants) {
    const exists = await SectionSetting.findOne({ tenant: tenant.slug, sectionKey: meta.key });
    if (exists) continue;

    await SectionSetting.create({
      tenant: tenant.slug,
      sectionKey: meta.key,
      enabled: meta.defaultEnabled,
      order: meta.defaultOrder,
      variant: meta.variant,
      ...DEFAULT_SETTING,
      params: meta.params || {},
    });
    createdCount++;

    logger.info(
      t("sync.sectionSettingCreated", "tr", translations, { sectionKey: meta.key, tenant: tenant.slug }),
      {
        module: "seedSectionSettingsForNewSection",
        event: "sectionSetting.created",
        status: "success",
        tenant: tenant.slug,
        sectionKey: meta.key,
      }
    );
  }

  logger.info(
    t("sync.sectionSettingSummary", "tr", translations, { sectionKey: meta.key, createdCount }),
    {
      module: "seedSectionSettingsForNewSection",
      event: "sectionSetting.summary",
      status: "info",
      sectionKey: meta.key,
      createdCount,
    }
  );

  console.log(`✅ [${NEW_SECTION_KEY}] SectionSetting seed işlemi tamamlandı. Eklenen: ${createdCount}`);
}


export { seedSectionSettingsForNewSection };
