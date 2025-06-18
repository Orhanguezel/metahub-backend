

* **Kimi yerde `t`, kimi yerde `translate` fonksiyonu var.**
* Ayrıca import şekli ve fonksiyon adı kodun genel standardında tutarlı olmalı.

Senin örneklerinde de olduğu gibi, **tüm projede** *tek bir i18n fonksiyonu adı ve import yapısı* kullanmak en iyi pratik.
Kullandığın fonksiyonun adı daima `t` olmalıysa, tüm controller/service/modüllerde şöyle olmalı:

---

## **1. Doğru translate fonksiyonu (utils/i18n/translate.ts)**

```ts
// src/core/utils/i18n/translate.ts
import type { SupportedLocale } from "@/types/common";

/**
 * i18n çeviri fonksiyonu
 * - Modül i18n dosyasından alır
 * - t("key", "de", translations, { name: "Test" })
 */
export function t(
  key: string,
  locale: SupportedLocale,
  translations: Record<SupportedLocale, any>,
  vars?: Record<string, string | number>
): string {
  let str = translations[locale]?.[key] || translations["en"]?.[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`{${k}}`, "g"), String(v));
    }
  }
  return str;
}
```

> **Not:**
> Eğer birden fazla modülün/alanın key'i ("resolveTenant.success" gibi) varsa, bu şekilde kullanacaksın:
> `t("resolveTenant.success", locale, translations, { tenant })`

---

## **2. Kullanımda import şu şekilde olmalı:**

**Her yerde:**

```ts
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import translations from "./i18n"; // Modülün kendi çeviri dosyası
```

Ve fonksiyon şu şekilde kullanılmalı:

```ts
const msg = t("resolveTenant.success", req.locale || getLogLocale(), translations, { tenant });
```

---

## **3. injectTenantModel için Düzeltilmiş Versiyon**

```ts
import { Request, Response, NextFunction } from "express";
import { getTenantModel } from "@/core/middleware/tenant/modelRegistry";
import { Schema } from "mongoose";
import { resolveTenantFromRequest } from "./resolveTenant";
import logger from "@/core/middleware/logger/logger";
import translations from "./i18n"; // Kendi modülünün i18n'i
import { t } from "@/core/utils/i18n/translate";
import { getLogLocale } from "@/core/utils/i18n/getLogLocale";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

export const injectTenantModel = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let tenant: string;
  try {
    tenant = resolveTenantFromRequest(req);
    req.tenant = tenant;

    req.getModel = async <T = any>(modelName: string, schema: Schema<T>) => {
      return getTenantModel<T>(tenant, modelName, schema);
    };

    // t fonksiyonu ile çoklu dil + context log
    logger.info(
      t("resolveTenant.success", req.locale || getLogLocale(), translations, { tenant }),
      {
        tenant,
        ...getRequestContext(req),
        module: "tenant",
        event: "tenant.resolveTenant",
        status: "success",
        host: req.hostname,
        headers: {
          host: req.headers.host,
          "x-tenant": req.headers["x-tenant"],
        },
      }
    );
    next();
  } catch (err) {
    logger.error(
      t("resolveTenant.fail", req.locale || getLogLocale(), translations),
      {
        tenant: req.tenant || "unknown",
        ...getRequestContext(req),
        module: "tenant",
        event: "tenant.resolveTenant",
        status: "fail",
        error: err,
        host: req.hostname,
        headers: {
          host: req.headers.host,
          "x-tenant": req.headers["x-tenant"],
        },
      }
    );
    res.status(400).json({
      success: false,
      message: t("resolveTenant.fail", req.locale || getLogLocale(), translations),
      detail: err?.message || err,
    });
  }
};
```

---

## **4. Özet:**

* **Her yerde:**
  `import { t } from "@/core/utils/i18n/translate";`
* **Kullanım:**
  `t("key", req.locale || getLogLocale(), translations, vars)`

**Böylece tüm backend kodun i18n, logger ve tenant context’te tam tutarlı, single-source ve scalable kalır.**

---