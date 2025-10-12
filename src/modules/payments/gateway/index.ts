import type {
  GatewayCredentials,
  GatewayAdapter,
  PaymentProvider,
} from "../types/gateway.types";

import { StripeAdapter } from "./adapters/stripe.adapter";
import { PaypalAdapter } from "./adapters/paypal.adapter";
import { IyzicoAdapter } from "./adapters/iyzico.adapter";
import { PaytrAdapter } from "./adapters/paytr.adapter";
import { CraftgateAdapter } from "./adapters/craftgate.adapter";
import { PaparaAdapter } from "./adapters/papara.adapter";
import { PaycellAdapter } from "./adapters/paycell.adapter";

export function getAdapter(provider: PaymentProvider): GatewayAdapter {
  switch (provider) {
    case "stripe":    return new StripeAdapter();
    case "paypal":    return new PaypalAdapter();
    case "iyzico":    return new IyzicoAdapter();
    case "paytr":     return new PaytrAdapter();
    case "craftgate": return new CraftgateAdapter();
    case "papara":    return new PaparaAdapter();
    case "paycell":   return new PaycellAdapter();
    case "manual":
    default:
      throw new Error(`unknown_payment_provider:${String(provider)}`);
  }
}

function resolveEnv(v: any): any {
  if (typeof v !== "string") return v;

  // ${VAR_NAME}
  const m = v.match(/^\$\{([A-Z0-9_]+)\}$/);
  if (m?.[1]) return process.env[m[1]] ?? v;

  // env:VAR_NAME
  if (v.startsWith("env:")) return process.env[v.slice(4)] ?? "";

  // Düz ENV adı (tam eşleşme)
  if (/^[A-Z0-9_]+$/.test(v) && process.env[v] != null) return process.env[v]!;

  return v;
}

/** Credentials normalize – trim + env çözme + bilinen alanlar + passthrough */
export function normalizeCredentials(input: any): GatewayCredentials {
  const src = input || {};
  const out: GatewayCredentials = {};
  const put = (k: keyof GatewayCredentials, val: any) => {
    if (val === undefined || val === null) return;
    const v = resolveEnv(val);
    (out as any)[k] = typeof v === "string" ? v.trim() : v;
  };

  put("apiKey",        src.apiKey        ?? src.API_KEY);
  put("secretKey",     src.secretKey     ?? src.SECRET_KEY);
  put("publicKey",     src.publicKey     ?? src.PUBLIC_KEY);
  put("merchantId",    src.merchantId    ?? src.MERCHANT_ID);
  put("clientId",      src.clientId      ?? src.CLIENT_ID);
  put("clientSecret",  src.clientSecret  ?? src.CLIENT_SECRET);
  put("webhookSecret", src.webhookSecret ?? src.WEBHOOK_SECRET);
  put("baseUrl",       src.baseUrl       ?? src.BASE_URL);
  put("mode",          src.mode);

  // provider-özel alanlar passthrough (ENV çözülerek)
  for (const [k, v] of Object.entries(src)) {
    if (!(k in out)) (out as any)[k] = resolveEnv(v);
  }
  return out;
}

/** Geriye dönük alias */
export const normalizeCreds = normalizeCredentials;
