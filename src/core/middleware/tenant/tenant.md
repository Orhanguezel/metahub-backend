Dosyaları ve mevcut sistemi detaylıca inceledikten sonra, **tenant verilerini artık tenant modülünden (`Tenants` modeli)** doğrudan çekmek için yapman gereken işlemler ve değiştirmen gereken dosyalar aşağıdaki gibidir:

---

## 🚀 Genel Yaklaşım:

Şu anki yapı, tenant bilgisini statik dosyalardan (`tenants.json` ve `.env.<tenant>`) alıyor. Bu yapıyı artık doğrudan **veritabanındaki Tenant koleksiyonundan çekmeye dönüştüreceğiz**.

Özetle adımlar:

1. **Middleware** (`resolveTenant.ts`) dosyasında değişiklik yapılarak tenant verisini doğrudan MongoDB'deki `Tenants` koleksiyonundan almasını sağlamak.
2. Tenant'ın MongoDB URI bilgisini `.env.<tenant>` yerine `mongoUri` alanından doğrudan çekmek.
3. `tenantDb.ts` dosyasını, MongoDB URI'yi **`Tenants` verisinden alacak şekilde** güncellemek.

---

## ⚙️ Yapılacak Değişiklikler (dosya bazında):

### ✅ 1. `resolveTenant.ts` (ÖNEMLİ!)

Bu middleware, şu anda `tenants.json` üzerinden tenant adını çözüyor. **Artık veritabanından çözmeli:**

**Yeni `resolveTenant.ts` Örneği:**

```typescript
import { Request, Response, NextFunction } from "express";
import { Tenants } from "@/modules/tenants/tenants.model"; // tenant modeli eklenmeli
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  const host = req.headers.host?.split(":")[0];

  if (!host) {
    logger.error("No host header found", getRequestContext(req));
    return res.status(400).json({ message: "Host header required." });
  }

  try {
    const tenant = await Tenants.findOne({ "domain.main": host }).lean();
    if (!tenant) {
      logger.error(`Tenant not found for host: ${host}`, getRequestContext(req));
      return res.status(404).json({ message: `Tenant not found for host: ${host}` });
    }

    req.tenant = tenant.slug;
    req.tenantData = tenant; // Tüm tenant verisini ekleyelim (optional)
    next();
  } catch (err) {
    logger.error("Tenant resolution error", { error: err, ...getRequestContext(req) });
    res.status(500).json({ message: "Internal server error" });
  }
};
```

Artık tenant bilgisi doğrudan veritabanından çekiliyor.

---

### ✅ 2. `tenantDb.ts` (ÖNEMLİ!)

Bu dosyada MongoDB bağlantı bilgisini `.env.<tenant>` yerine tenant verisinden (`tenant.mongoUri`) çekecek şekilde güncellemelisin:

**Yeni `getTenantDbConnection`:**

```typescript
import mongoose from "mongoose";
import logger from "@/core/middleware/logger/logger";
import { Tenants } from "@/modules/tenants/tenants.model";

const connections: Record<string, mongoose.Connection> = {};

export const getTenantDbConnection = async (tenantSlug: string): Promise<mongoose.Connection> => {
  if (connections[tenantSlug]) return connections[tenantSlug];

  const tenant = await Tenants.findOne({ slug: tenantSlug }).lean();
  if (!tenant || !tenant.mongoUri) {
    throw new Error(`Mongo URI not found for tenant ${tenantSlug}`);
  }

  const conn = mongoose.createConnection(tenant.mongoUri, {
    bufferCommands: false,
    autoCreate: true,
  });

  await new Promise<void>((resolve, reject) => {
    conn.once("open", () => {
      connections[tenantSlug] = conn;
      logger.info(`Tenant DB connected: ${tenantSlug}`);
      resolve();
    });

    conn.on("error", (err) => {
      logger.error(`Tenant DB connection failed: ${tenantSlug}`, { error: err });
      reject(err);
    });
  });

  return conn;
};
```

Bu şekilde artık her tenant için DB bağlantısı, tenant modelindeki URI üzerinden kurulacak.

---

### ✅ 3. `getTenantModels.ts` ve `getTenantModelsFromConnection.ts`

Bu dosyalar zaten tenant connection'ları kullandığı için değiştirmene gerek yok. Bunlar otomatik olarak oluşturulan bağlantı üzerinden modelleri verecek. Eğer modelleri doğru döndürüyorsa ek değişiklik gerekmez.

**Bu dosyalar şu yapıyı destekliyor olmalı:**

```typescript
// getTenantModels.ts
import { getTenantDbConnection } from "@/core/config/tenantDb";
import { injectTenantModel } from "./injectTenantModel";

export const getTenantModels = async (req: Request) => {
  const tenant = req.tenant; // slug artık resolveTenant tarafından set ediliyor.
  const connection = await getTenantDbConnection(tenant);
  return injectTenantModel(connection);
};
```

`injectTenantModel.ts` ve `modelRegistry.ts` dosyaların mevcut yapısı muhtemelen uygundur. (Sadece doğrula.)

---

### ✅ 4. `injectTenantModel.ts` ve `modelRegistry.ts` (Kontrol):

Bu iki dosyada **model tanımları doğru olduğundan emin ol**. Örneğin:

```typescript
// injectTenantModel.ts (Örnek Yapı)
import { Connection } from "mongoose";
import { getTenantModelsFromConnection } from "./getTenantModelsFromConnection";

export const injectTenantModel = (connection: Connection) => {
  return getTenantModelsFromConnection(connection);
};
```

```typescript
// modelRegistry.ts (Örnek Yapı)
import { Connection } from "mongoose";
import { TenantModel } from "@/modules/tenants/tenants.model";

export const getTenantModelsFromConnection = (connection: Connection) => ({
  Tenants: connection.model("Tenants", TenantModel.schema),
  // Diğer modeller...
});
```

Bu dosyalar **doğru** yapıdaysa hiç değişiklik yapmana gerek yoktur.

---

## 📌 Son Kontroller (Önemli):

* ✅ Tüm modüllerde, tenant DB bağlantısını kullanan modelleri kullanırken (`getTenantModels`) fonksiyonunu doğru kullandığından emin ol.
* ✅ Artık `.env.<tenant>` dosyalarına ihtiyaç yoktur, çünkü her tenant'ın MongoDB URI'si veritabanından okunuyor.

---

## 🔑 Nasıl Çalışacak (Yeni Sistem):

* Gelen istek → Middleware `resolveTenant` → Host header'ından tenant bulur (DB'den)
* Tenant bulunduğunda → tenant slug ve verisini `req` üzerine ekler.
* `getTenantDbConnection` bu slug üzerinden ilgili MongoDB URI'sini DB'den alır ve bağlantı oluşturur.
* Bu bağlantı kullanılarak modeller inject edilir ve **tenant özel veriler tenant özel veritabanından çekilir**.

---

## 🚨 Dikkat Edilecekler:

* DB bağlantı URI’leri, Tenant dokümanında doğru ve erişilebilir olmalı.
* Uygulama başlatılırken temel (`default`) tenant DB’sine bağlanıp bu Tenant koleksiyonunu okuyabiliyor olmalı.

---

Bu adımları uyguladıktan sonra yeni sistemin istediğin gibi çalışacaktır. Eğer takıldığın bir nokta olursa buradayım! 💪✨
