import { body, param } from "express-validator";

/** Desteklenen ödeme sağlayıcıları */
export const PROVIDERS = [
  "stripe", "paypal", "iyzico", "paytr", "craftgate", "papara", "paycell", "manual",
] as const;

/** ENV üzerinden min tutar (minor units) okumak için yardımcı:
 *  PAYMENTS_MIN_BY_CURRENCY='{"try":2500,"usd":50}'
 */
const readMinMapFromEnv = (): Record<string, number> => {
  try {
    const raw = process.env.PAYMENTS_MIN_BY_CURRENCY;
    if (!raw) return {};
    const obj = JSON.parse(raw);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = String(k).toLowerCase();
      const val = Number(v);
      if (Number.isFinite(val) && val >= 0) out[key] = Math.round(val);
    }
    return out;
  } catch {
    return {};
  }
};

/** Varsayılan min harita (konfigüre edilebilir). TRY 2500 (= ₺25) geçmiş uyumluluk için varsayılan. */
const DEFAULT_MIN_MAP: Record<string, number> = { try: 2500 };

/** number → integer minor units (ör. 1990.66 → 1991) */
const toMinorInt = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return v; // bir sonraki validator yakalar
  return Math.round(n);
};

/** Ortak min tutar enforcement */
const enforceMinByCurrency = (amountMinor: number, currency?: string) => {
  const envMap = readMinMapFromEnv();
  const cur = String(currency || "TRY").toLowerCase();
  const min = envMap[cur] ?? DEFAULT_MIN_MAP[cur];
  if (typeof min === "number" && amountMinor < min) {
    throw new Error(`amount_below_minimum:${cur}:${min}`);
  }
};

/** items toplamı ile amount tutarlılık kontrolü (±1 tolerans) */
const validateItemsTotalMatchesAmount = (amount: number, items?: any[]) => {
  if (!Array.isArray(items) || !items.length) return true;
  const sum = items.reduce((s, it) => {
    const u = Math.round(Number(it?.unitAmount ?? 0));
    const q = Math.round(Number(it?.qty ?? 0));
    return s + (Number.isFinite(u) && Number.isFinite(q) ? u * q : 0);
  }, 0);
  const diff = Math.abs(sum - amount);
  if (diff > 1) throw new Error(`amount_mismatch: items_total=${sum}, body.amount=${amount}`);
  return true;
};

/* =========================
 * PUBLIC: CHECKOUT VALIDATOR
 * ========================= */
export const createCheckoutValidators = [
  // Temel alanlar
  body("provider").isIn(PROVIDERS as unknown as string[]),
  body("orderId").optional().isMongoId(),

  body("currency")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .bail()
    .customSanitizer((s) => String(s).toUpperCase()),

  body("method").optional().isIn(["card","wallet","bank_transfer","cash","other"]),
  body("ui_mode").optional().isIn(["embedded","hosted","elements"]),

  // amount: OPSİYONEL — orderId varsa BE zaten sipariş tutarını kullanır
  body("amount")
    .optional()
    .customSanitizer(toMinorInt)
    .isInt({ min: 1 })
    .withMessage("amount must be a positive integer in minor units")
    .bail()
    .custom((v, { req }) => {
      if (v == null) return true;
      enforceMinByCurrency(Number(v), req.body?.currency);
      return true;
    }),

  // items: opsiyonel liste
  body("items").optional().isArray(),

  // items[*].unitAmount: minor int’e yuvarla + ≥1
  body("items.*.unitAmount")
    .optional()
    .customSanitizer(toMinorInt)
    .isInt({ min: 1 })
    .withMessage("items[].unitAmount must be integer minor units"),

  // items[*].qty: minor int (adet) + ≥1
  body("items.*.qty")
    .optional()
    .customSanitizer(toMinorInt)
    .isInt({ min: 1 })
    .withMessage("items[].qty must be a positive integer"),

  // amount + items toplamı eşleşmesi (±1 tolerans)
  body().custom((_, { req }) => {
    const amount = req.body?.amount;
    if (amount == null) return true;
    return validateItemsTotalMatchesAmount(Number(amount), req.body?.items);
  }),

  // Müşteri e-postası (varsa) temel kontrol
  body("customer.email").optional().isEmail().withMessage("customer.email must be a valid email"),
];

/* =========================
 * PUBLIC: CAPTURE VALIDATOR
 * ========================= */
export const captureValidators = [
  body("provider").isIn(PROVIDERS as unknown as string[]),
  body("providerRef").notEmpty(),
  body("amount").optional().isInt({ min: 1 }),
];

/* ========================
 * PUBLIC: REFUND VALIDATOR
 * ======================== */
export const providerRefundValidators = [
  body("provider").isIn(PROVIDERS as unknown as string[]),
  body("providerRef").notEmpty(),
  body("amount").optional().isInt({ min: 1 }),
  body("reason").optional().isString(),
];

/* ========================
 * WEBHOOK: PARAM VALIDATOR
 * ======================== */
export const webhookProviderParamValidator = [
  param("provider").isIn(PROVIDERS as unknown as string[]),
];

/* Export yardımcılar (gerekirse controller/adapters içinde de kullanılsın) */
export const __test__ = {
  toMinorInt,
  enforceMinByCurrency,
  validateItemsTotalMatchesAmount,
  readMinMapFromEnv,
  DEFAULT_MIN_MAP,
};
