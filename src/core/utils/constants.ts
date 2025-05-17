// 🔠 Veritabanında kullanılacak büyük harfli sabit değerler
export const ALLOWED_COMMENT_CONTENT_TYPES = [
  "EnsotekProd",
  "RadonarProd",
  "Blog",
  "News",
  "Services",
  "Articles",
  "Activity",
] as const;

export type CommentContentType = (typeof ALLOWED_COMMENT_CONTENT_TYPES)[number];

// ⚙️ Küçük harfli değerlerle kontrol yapabilmek için set versiyonu
export const ALLOWED_COMMENT_CONTENT_TYPES_LOWER = new Set(
  ALLOWED_COMMENT_CONTENT_TYPES.map((t) => t.toLowerCase())
);
