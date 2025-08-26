// src/modules/menu/constants/foodLabels.ts
import type { Request } from "express";
import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TranslatedLabel,
} from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "@/modules/menuitem/i18n";

/* ------------------------------------------------------------------ */
/* req.locale'a göre çeviri yapan yardımcı                             */
/* ------------------------------------------------------------------ */
export const tByReq = (req: Request) => (k: string, p?: any) =>
  translate(k, (req.locale as SupportedLocale) || getLogLocale(), translations as any, p);

/* ------------------------------------------------------------------ */
/* Kod tipleri                                                         */
/* ------------------------------------------------------------------ */
export type AdditiveCode =
  "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "13";

export type AllergenCode =
  "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r";

/* ------------------------------------------------------------------ */
/* Kod listeleri                                                       */
/* ------------------------------------------------------------------ */
export const ADDITIVE_KEYS = [
  "1","2","3","4","5","6","7","8","9","10","11","12","13",
] as const satisfies ReadonlyArray<AdditiveCode>;

export const ALLERGEN_KEYS = [
  "a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r",
] as const satisfies ReadonlyArray<AllergenCode>;

const buildTL = (
  ns: "additives" | "allergens",
  code: string
): TranslatedLabel => {
  return SUPPORTED_LOCALES.reduce<TranslatedLabel>((acc, lng) => {
    const val = translate(`${ns}.${code}`, lng, translations as any);
    acc[lng] = typeof val === "string" && val.trim() ? val : code; // fallback
    return acc;
  }, {} as TranslatedLabel);
};

/* ------------------------------------------------------------------ */
/* Sabit sözlükler                                                     */
/* ------------------------------------------------------------------ */
export const ADDITIVES = ADDITIVE_KEYS.map((key) => ({
  key,
  value: buildTL("additives", key),
})) as readonly { key: AdditiveCode; value: TranslatedLabel }[];

export const ALLERGENS = ALLERGEN_KEYS.map((key) => ({
  key,
  value: buildTL("allergens", key),
})) as readonly { key: AllergenCode; value: TranslatedLabel }[];

/* Hızlı erişim map'leri */
export const ADDITIVE_MAP: Readonly<Record<AdditiveCode, TranslatedLabel>> =
  Object.fromEntries(ADDITIVES.map((a) => [a.key, a.value])) as Record<
    AdditiveCode,
    TranslatedLabel
  >;

export const ALLERGEN_MAP: Readonly<Record<AllergenCode, TranslatedLabel>> =
  Object.fromEntries(ALLERGENS.map((a) => [a.key, a.value])) as Record<
    AllergenCode,
    TranslatedLabel
  >;

/* ------------------------------------------------------------------ */
/* İsteğe bağlı: req bazlı tek dilli yardımcılar (UI için pratik)      */
/* ------------------------------------------------------------------ */
export const getAdditivesLocalized = (req: Request) => {
  const t = tByReq(req);
  return ADDITIVE_KEYS.map((key) => ({ key, label: String(t(`additives.${key}`)) }));
};

export const getAllergensLocalized = (req: Request) => {
  const t = tByReq(req);
  return ALLERGEN_KEYS.map((key) => ({ key, label: String(t(`allergens.${key}`)) }));
};

export const additiveLabel = (req: Request, code: AdditiveCode) =>
  String(tByReq(req)(`additives.${code}`));

export const allergenLabel = (req: Request, code: AllergenCode) =>
  String(tByReq(req)(`allergens.${code}`));
