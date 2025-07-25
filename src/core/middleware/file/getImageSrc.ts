// utils/getImageSrc.ts
export const getImageSrc = (
  url?: string,
  folder: string = "profile-images"
): string => {
  if (!url || url.trim() === "") return "/user/default-avatar.png";

  url = encodeURI(url.trim());

  if (url.startsWith("http")) return url;
  if (url.startsWith("/uploads")) return url;
  if (url.startsWith("uploads")) return `/${url}`;

  // Son çare: local uploads içinde ilgili klasörde arar
  return `/uploads/${folder}/${url}`;
};
