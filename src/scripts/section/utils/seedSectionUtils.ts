// src/scripts/section/utils/seedSectionUtils.ts

import { SectionMeta, SectionSetting } from "@/modules/section/section.models";
import { Tenants } from "@/modules/tenants/tenants.model";
import { fillAllLocales } from "@/core/utils/i18n/fillAllLocales";
import { SUPPORTED_LOCALES } from "@/types/common";

/**
 * Tüm aktif tenantları çeker (slug array’i)
 * @returns {Promise<string[]>}
 */
export async function getAllActiveTenantSlugs(): Promise<string[]> {
  const tenants = await Tenants.find({ isActive: true }, { slug: 1 }).lean();
  return tenants.map((t: { slug: string }) => t.slug);
}

/**
 * SectionMeta seed datasındaki eksik dilleri tamamlar
 * (label ve description alanlarını doldurur)
 */
export function fillSectionMetaLocales(sectionMetaSeed: any[]) { 

  sectionMetaSeed.forEach((s) => {
    s.label = fillAllLocales(s.label);
    if (s.description) s.description = fillAllLocales(s.description);
    if (!("required" in s)) s.required = false;
    if (!("params" in s)) s.params = {};
    // Burada yeni field’lar eklemek gerekirse eklenebilir!
  });
}

/**
 * Bir tenant için, SectionMeta’dan SectionSetting oluşturur.
 * @param tenantSlug string (ör: "demo", "main-tenant")
 * @param meta SectionMeta objesi
 * @param extraSettings İstenirse override ayarları (örn: { visibleInSidebar: false })
 */
export async function createSectionSettingForTenant(
  tenantSlug: string,
  meta: any,
  extraSettings: Partial<any> = {}
) {
  // label ve description override edilmediyse null yap, boş obje göndermeyin!
  let safeSettings = { ...extraSettings };
  if (!("label" in safeSettings)) safeSettings.label = null;
  if (!("description" in safeSettings)) safeSettings.description = null;

  return SectionSetting.create({
    tenant: tenantSlug,
    sectionKey: meta.key,
    enabled: meta.defaultEnabled,
    order: meta.defaultOrder,
    variant: meta.variant,
    params: meta.params || {},
    roles: ["admin"],
    ...safeSettings,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Tek SectionMeta için var/yok kontrolü (güncelleme veya ekleme)
 * @param sectionMetaData JSON veya SectionMeta objesi
 * @returns { created: boolean, updated: boolean }
 */
export async function upsertSectionMeta(sectionMetaData: any) {
  const existing = await SectionMeta.findOne({ key: sectionMetaData.key });
  if (existing) {
    await SectionMeta.updateOne({ key: sectionMetaData.key }, { $set: sectionMetaData });
    return { created: false, updated: true };
  } else {
    await SectionMeta.create(sectionMetaData);
    return { created: true, updated: false };
  }
}
