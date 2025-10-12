import type { SupportedLocale } from "@/types/common";

/** Çok dilli alan */
export type TranslatedLabel = Partial<Record<SupportedLocale, string>>;

/** Kategori/Zone/Component sabitleri (admin’de filtreler için faydalı) */
export const SECTION_ZONES = ["home", "layout", "page", "blog", "product"] as const;
export type SectionZone = typeof SECTION_ZONES[number] | string;

export const LAYOUT_COMPONENTS = ["header", "footer", "sidebar"] as const;
export type LayoutComponent = typeof LAYOUT_COMPONENTS[number] | string;

/** TEK model: tenant başına sectionKey benzersizdir */
export interface ISection {
  tenant: string;

  /** Benzersiz iş anahtarı (tenant içinde unique) */
  sectionKey: string;

  /** Klasörleme / Admin filtre (örn: home | layout | page …) */
  zone?: SectionZone;

  /** Layout için (örn: header | footer | sidebar) — diğer zonelerde boş olabilir */
  component?: LayoutComponent;

  /** İsteğe bağlı daha ince sınıflama */
  category?: string;

  icon?: string;                 // örn: "MdViewModule"
  label?: TranslatedLabel;       // çoklu dil etiket
  description?: TranslatedLabel; // çoklu dil açıklama

  /** Görsel varyant anahtarı (örn: slider, classic, navSimple, footColumns …) */
  variant?: string;

  /** Durum & sıralama */
  enabled: boolean;
  order: number;

  /** Erişim rolleri (opsiyonel) */
  roles?: string[];

  /** Bileşene özel parametreler */
  params?: Record<string, any>;

  /** Meta */
  required?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

/* ——— Geriye dönük uyumluluk (eski import’lar kırılmasın) ——— */
export type ISectionMeta = ISection;
export type ISectionSetting = ISection;
