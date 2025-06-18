Elbette. Aşağıda **MetaHub Çoklu Tenant Sistemi** için önerdiğimiz “**Tek Backend, Tek PM2, X-Tenant Header ile Yönlendirme**” yapısının tam dökümantasyonunu hazırladım.

---

# 🧭 **MetaHub Çoklu Tenant Mimarisi (Best Practice)**

Bu döküman, tüm tenant projelerinin **tek backend** ve **tek frontend build'i** ile **yüksek performanslı**, **ölçeklenebilir** ve **modüler** olarak nasıl çalışacağını tanımlar.

---

## 🎯 **Temel İlkeler**

* ✅ **Tek backend (Node.js / Express)**
* ✅ **Tek PM2 process (tek `dist/server.js`)**
* ✅ **Frontend’ler domain bazlı ayrılır**
* ✅ **Backend tenant belirlemesini `X-Tenant` header veya `req.hostname` üzerinden yapar**
* ✅ **MongoDB bağlantısı runtime'da `.env.{tenant}` dosyasına göre yapılır**

---

## 🏗️ Sistem Mimarisi

```plaintext
🌍 koenigsmassage.com     --->  https://api.guezelwebdesign.com (X-Tenant: anastasia)
🌍 guezelwebdesign.com    --->  https://api.guezelwebdesign.com (X-Tenant: metahub)
🌍 ensotek.de             --->  https://api.guezelwebdesign.com (X-Tenant: ensotek)
🌍 radanor.de             --->  https://api.guezelwebdesign.com (X-Tenant: radanor)
```

Tüm frontendler kendi domaininde barınır.
Tek bir backend (`api.guezelwebdesign.com`) üzerinden hizmet alır.

---

## ⚙️ Backend Yapılandırması

### 📁 `.env.{tenant}` dosyaları

Her tenant için bir `.env.anastasia`, `.env.metahub`, `.env.ensotek` dosyası vardır.

```dotenv
# .env.anastasia
MONGO_URI=mongodb+srv://.../anastasia
JWT_SECRET=...
BRAND_NAME=KoenigsMassage
...
```

### 🧠 `resolveTenant.ts`

```ts
export const resolveTenantFromHost = (host: string): string => {
  const map = {
    "koenigsmassage.com": "anastasia",
    "guezelwebdesign.com": "metahub",
    "ensotek.de": "ensotek",
    "radanor.de": "radanor",
  };

  const normalized = host.toLowerCase();
  for (const key in map) {
    if (normalized.includes(key)) return map[key];
  }

  return "default";
};
```

### 🌐 `injectTenantModel.ts` middleware

Tenant'ı resolve eder ve `req.getModel` fonksiyonunu aktif eder.

```ts
req.tenant = resolveTenantFromHost(req.hostname);
req.getModel = async (model, schema) => getTenantModel(req.tenant, model, schema);
```

---

## 🚀 PM2 Konfigürasyonu

### 📄 `ecosystem.config.js`

Sadece **tek backend** çalıştırılır:

```js
module.exports = {
  apps: [
    {
      name: "metahub-api",
      script: "./dist/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5014,
      },
    },
  ],
};
```

---

## 🌐 Nginx Reverse Proxy (Opsiyonel)

Her frontend domaini doğru API endpointine yönlendirir.

```nginx
# koenigsmassage.com
location /api/ {
  proxy_pass https://api.guezelwebdesign.com/api/;
  proxy_set_header Host $host;
  proxy_set_header X-Tenant anastasia;
}

# ensotek.de
location /api/ {
  proxy_pass https://api.guezelwebdesign.com/api/;
  proxy_set_header Host $host;
  proxy_set_header X-Tenant ensotek;
}
```

> ❗ Eğer frontend kendisi `X-Tenant` header'ını gönderiyorsa Nginx’te ayar yapmaya gerek yoktur.

---

## 💻 Frontend Yapılandırması

Her tenant için ayrı `.env.production` dosyası:

```dotenv
# .env.production (örnek: anastasia)
NEXT_PUBLIC_API_BASE_URL=https://api.guezelwebdesign.com
NEXT_PUBLIC_APP_ENV=anastasia
TENANT_NAME=anastasia
```

Kendi `PM2` build'i:

```js
{
  name: "anastasia-prod",
  script: ".next/standalone/server.js",
  cwd: "/var/www/tenant-frontends/anastasia-frontend",
  env: {
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_ENV: "anastasia",
    NEXT_PUBLIC_API_BASE_URL: "https://api.guezelwebdesign.com",
    COOKIE_DOMAIN: ".koenigsmassage.com"
  }
}
```

---

## 📡 API İsteklerinde Tenant Belirleme

### Yöntem 1: `X-Tenant` Header (Tercih Edilen)

```ts
axios.get("/api/settings", {
  headers: {
    "X-Tenant": "anastasia"
  }
});
```

### Yöntem 2: `Host` Header (Fallback)

Backend `req.hostname` üzerinden çözer.

---

## 🧠 Neden Bu Yapı?

| Avantaj                     | Açıklama                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| ✅ Tek backend, kolay deploy | Tek `pm2 restart` ile tüm sistem                                 |
| ✅ Verimli kaynak kullanımı  | Her tenant için ayrı process gerekmez                            |
| ✅ SEO uyumlu                | Her frontend kendi domaininde barınır                            |
| ✅ Ölçeklenebilir            | Yeni tenant eklemek sadece `.env` + `resolveTenant` güncellemesi |
| ✅ Yönetilebilir             | Tenant bazlı loglama, model cache, DB ayrımı desteklenir         |

---

## ✅ Kontrol Listesi

| Adım                                    | Durum |
| --------------------------------------- | ----- |
| `.env.{tenant}` dosyaları hazır         | ✅     |
| `resolveTenantFromHost` güncel          | ✅     |
| PM2 tek backend çalışıyor               | ✅     |
| Frontend’ler doğru env ile build edildi | ✅     |
| X-Tenant header aktif                   | ✅     |
| Veritabanı bağlantıları izole           | ✅     |

---

İstersen bu yapıyı `README.md` veya `docs/architecture.md` dosyası olarak hazırlayabilirim.
Devam etmek istersen “tenant ekleme talimatı” veya “troubleshooting” bölümleri de eklenebilir.
