// utils/getImageSrc.ts
export const getImageSrc = (
  url?: string,
  folder: string = "profile-images"
): string => {
  if (!url || url.trim() === "") return "/user/default-avatar.png";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads")) return url;
  if (url.startsWith("uploads")) return `/${url}`;

  // sadece dosya adı verilmişse
  return `/uploads/${folder}/${url}`;
};
