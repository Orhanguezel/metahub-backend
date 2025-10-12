// src/services/translate.service.ts

import { SUPPORTED_LOCALES, type SupportedLocale } from "@/types/common";
import { llmChat, extractJsonSafe } from "@/services/llm.service";

/** Ortak: locale listesi ve yardımcılar */
const LOCALES = SUPPORTED_LOCALES as readonly SupportedLocale[];

const emptyMap = (): Record<SupportedLocale, string> =>
  Object.fromEntries(LOCALES.map((l) => [l, ""])) as Record<SupportedLocale, string>;

const copyAll = (src: string): Record<SupportedLocale, string> => {
  const out = {} as Record<SupportedLocale, string>;
  for (const l of LOCALES) out[l] = src;
  return out;
};

type TranslateOpts = { keepNumbersUnits?: boolean; maxLen?: number };

function clip(s: string, max?: number) {
  if (!max || max <= 0) return s;
  return s.length <= max ? s : s.slice(0, max);
}

/**
 * Tek bir metni tüm dillere çevirir.
 * - Kaynak dili otomatik algılar.
 * - Katı JSON döndürür, hatada fail-safe (orijinali kopyalar).
 * - İsteğe bağlı: sayıları ve ölçü birimlerini aynen korur.
 */
export async function translateToAllLocales(
  text: string,
  opts?: TranslateOpts
): Promise<Record<SupportedLocale, string>> {
  const base = clip((typeof text === "string" ? text : "").trim(), opts?.maxLen || 2000);
  if (!base) return emptyMap();

  const sys = [
    "You are a professional culinary translator.",
    "Auto-detect the source language.",
    `Return STRICT JSON with EXACT keys [${LOCALES.join(", ")}] and string values.`,
    "Do NOT add explanations or extra keys.",
    "Keep culinary terminology natural per language.",
    opts?.keepNumbersUnits
      ? "- Preserve numeric quantities and units (e.g., 200 g, 1 tbsp, 3–4 min) exactly."
      : "- Translate freely; keep meaning accurate.",
  ].join("\n");

  const user = `Translate the following text into locales [${LOCALES.join(
    ", "
  )}].\nTEXT:\n"""${base}"""`;

  try {
    const raw = await llmChat({
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      temperature: 0.0,
      forceJson: true,
      maxRetries: 3,
    });

    const parsed = (extractJsonSafe(raw) || {}) as Record<string, unknown>;
    const out = emptyMap();
    for (const l of LOCALES) {
      const v = typeof parsed[l] === "string" ? (parsed[l] as string).trim() : "";
      out[l] = v;
    }
    // En az bir dilde değer varsa kabul et, yoksa fail-safe:
    if (Object.values(out).some((v) => !!v)) return out;
    return copyAll(base);
  } catch {
    return copyAll(base);
  }
}

/**
 * Birden fazla metni tek seferde çevir (token/verim için batch).
 * Büyük batch’leri güvenli boyutlarda parçalara böler.
 */
export async function translateBatchToAllLocales(
  items: Array<{ key: string; text: string }>,
  opts?: TranslateOpts
): Promise<Record<string, Record<SupportedLocale, string>>> {
  const safeItems = (items || []).map((it) => ({
    key: String(it.key),
    text: clip((it.text ?? "").toString(), opts?.maxLen || 1000),
  }));

  // Parçalama: aynı anda çok uzun payload göndermemek için.
  const CHUNK_SIZE = 40; // pratik ve yeterli
  const chunks: Array<typeof safeItems> = [];
  for (let i = 0; i < safeItems.length; i += CHUNK_SIZE) {
    chunks.push(safeItems.slice(i, i + CHUNK_SIZE));
  }

  const results: Record<string, Record<SupportedLocale, string>> = {};

  for (const chunk of chunks) {
    if (!chunk.length) continue;

    const sys = [
      "You are a professional culinary translator.",
      "Auto-detect each item's source language independently.",
      `Return STRICT JSON: { "<key>": { ${LOCALES.map((l) => `"${l}":""`).join(", ")} }, ... }`,
      "Do NOT add explanations or extra keys.",
      opts?.keepNumbersUnits
        ? "- Preserve numeric quantities and units (e.g., 200 g, 1 tbsp, 3–4 min) exactly."
        : "- Translate freely; keep meaning accurate.",
    ].join("\n");

    const user = `Translate each item's "text" into locales [${LOCALES.join(
      ", "
    )}]. Return JSON object keyed by "key".\nDATA:\n${JSON.stringify(chunk, null, 2)}`;

    try {
      const raw = await llmChat({
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        temperature: 0.0,
        forceJson: true,
        maxRetries: 3,
      });

      const parsed = (extractJsonSafe(raw) || {}) as Record<string, any>;

      for (const it of chunk) {
        const p = parsed[it.key] || {};
        const map = emptyMap();
        for (const l of LOCALES) {
          const v = typeof p[l] === "string" ? p[l].trim() : "";
          map[l] = v || it.text; // boşsa fail-safe: orijinali kopyala
        }
        results[it.key] = map;
      }
    } catch {
      // Fail-safe: hepsini orijinal metinle doldur
      for (const it of chunk) {
        results[it.key] = copyAll(it.text);
      }
    }
  }

  return results;
}

/**
 * Var olan çok dilli bir objede (TranslatedLabel) boş dilleri
 * ilk dolu değerden otomatik çeviriyle tamamlar.
 */
export async function translateMissingLocales(
  tl: Record<SupportedLocale, string>,
  opts?: TranslateOpts
): Promise<Record<SupportedLocale, string>> {
  const out: Record<SupportedLocale, string> = { ...emptyMap(), ...(tl || {}) };
  const have = LOCALES.filter((l) => (out[l] ?? "").toString().trim());
  if (have.length === 0) return out;

  const source = out[have[0]]!.trim();
  const trans = await translateToAllLocales(source, opts);
  for (const l of LOCALES) {
    if (!out[l] || !out[l]!.trim()) out[l] = trans[l];
  }
  return out;
}
