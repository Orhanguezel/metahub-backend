// 🔠 Veritabanında kullanılacak büyük harfli sabit değerler
export const ALLOWED_COMMENT_CONTENT_TYPES = [
  "news", "blog", "product", "articles", "services", "bikes",
  "about", "references", "library", "company", "ensotekprod",
  "sparepart", "portfolio", "menuitem","massage","skill", "team", 
  "global" // ⬅️ EKLENDİ: testimonial için zorunlu
] as const;

// (İstersen bu type'ı dışarı export etmeyebilirsin; ama ediyorsan "global" artık dahil.)
export type CommentContentType = (typeof ALLOWED_COMMENT_CONTENT_TYPES)[number];

// ⚙️ Küçük harfli değerlerle kontrol yapabilmek için set versiyonu
export const ALLOWED_COMMENT_CONTENT_TYPES_LOWER = new Set(
  ALLOWED_COMMENT_CONTENT_TYPES.map((t) => t.toLowerCase())
);

export const ALLOWED_COMMENT_TYPES = [
  "comment", "testimonial", "review", "question", "answer", "rating"
] as const;
export type CommentType = (typeof ALLOWED_COMMENT_TYPES)[number];
