// 🔠 Veritabanında kullanılacak büyük harfli sabit değerler
export const ALLOWED_COMMENT_CONTENT_TYPES = [
  "Ensotekprod",
  "Sparepart",
  "Bike",
  "Blog",
  "News",
  "Services",
  "Articles",
  "Activity",
  "Company",
  "Library",
  "Product",
  "About",
  "References",
] as const;

export type CommentContentType = (typeof ALLOWED_COMMENT_CONTENT_TYPES)[number];

// ⚙️ Küçük harfli değerlerle kontrol yapabilmek için set versiyonu
export const ALLOWED_COMMENT_CONTENT_TYPES_LOWER = new Set(
  ALLOWED_COMMENT_CONTENT_TYPES.map((t) => t.toLowerCase())
);
