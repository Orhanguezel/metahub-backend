// src/core/utils/slugify.ts
export const setSlugFromTitle = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[\s]+/g, "-")          // Boşlukları tireye çevir
      .replace(/[^\w\-]+/g, "")         // Alfanumerik ve tire dışındaki karakterleri temizle
      .replace(/\-\-+/g, "-")           // Çoklu tireleri teke indir
      .replace(/^-+|-+$/g, "");         // Baş ve sondaki tireleri kaldır
  };
  