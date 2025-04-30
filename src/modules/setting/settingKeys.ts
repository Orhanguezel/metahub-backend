// src/modules/settings/settingKeys.ts

// 🎯 Ayar Anahtarları
export enum SettingKeys {
  SITE_NAME = "site_name",
  SITE_SLOGAN = "site_slogan",
  SITE_LOGO = "site_logo",
  SITE_FAVICON = "site_favicon",

  SOCIAL_FACEBOOK = "social_facebook",
  SOCIAL_INSTAGRAM = "social_instagram",
  SOCIAL_TWITTER = "social_twitter",
  SOCIAL_LINKEDIN = "social_linkedin",
  SOCIAL_YOUTUBE = "social_youtube",

  CONTACT_EMAIL = "contact_email",
  CONTACT_PHONE = "contact_phone",
  CONTACT_ADDRESS = "contact_address",

  SITE_DESCRIPTION = "site_description",

  SEO_TITLE = "seo_title",
  SEO_KEYWORDS = "seo_keywords",

  DEFAULT_LANGUAGE = "default_language",
  MAX_CONCURRENT_BOOKINGS = "max_concurrent_bookings",
  THEME_MODE = "theme_mode",
}

// 🌎 Çoklu Dil Destekli Ayarlar
export const MultiLanguageKeys: SettingKeys[] = [
  SettingKeys.SITE_NAME,
  SettingKeys.SITE_SLOGAN,
  SettingKeys.SITE_DESCRIPTION,
  SettingKeys.SEO_TITLE,
];


  