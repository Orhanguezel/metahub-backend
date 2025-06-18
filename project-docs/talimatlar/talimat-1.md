Aşağıda **MetaHub Backend için her modül ve tüm ekip üyeleri tarafından MUTLAKA uyulması gereken, tek kaynaktan yönetilen “Geliştirme Standartları ve Checklist” dokümanı** yer alıyor.
Bu içerik, önceki tüm doküman ve checklist’lerin birleşmiş, sadeleşmiş ve “tek bakışta” uygulanabilir halidir.
(Eklediğin modül güncelleme talimatları ve checklist’ler, [tenant](#), [i18n](#), [logger](#) ve son checklist dokümanlarından referans alınarak birleştirilmiştir.)

---

# 🛡️ **MetaHub Backend — Evrensel Modül Checklist & Talimatlar (Multilang + Tenant + Logger)**

---

## 🎯 **Ana Hedefler**

* Her modül **çok dilli**, **tenant-aware**, **log analiz uyumlu** ve **future-proof** olmalı.
* Hiçbir yerde hardcoded açıklama/dil/tenant/global model KULLANILMAMALI.

---

## 1️⃣ **Çoklu Dil (i18n) Standartları**

| Kontrol Noktası                                      | Açıklama                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Alanlar TranslatedLabel tipi mi?                     | `name`, `description`, `label` vb. `{tr, en, de, ...}` tipi olmalı |
| Veri fillAllLocales ile normalize ediliyor mu?       | Tek dilde dahi gelse, tüm locale’ler doldurulmalı                  |
| API response’ta parseMultilangField kullanılıyor mu? | Dışarıya çıkan veri her zaman standart formatta ve eksiksiz olmalı |
| Log/validasyon mesajı i18n/translate() ile mi?       | Hiçbir yerde hardcoded string yok; tüm mesajlar çeviri dosyasından |
| En az bir locale zorunlu mu?                         | Her multilang field’da en az bir locale boş olmamalı               |
| SUPPORTED\_LOCALES güncel ve modüllerle uyumlu mu?   | Yeni dil eklenirse tüm modüller ve dosyalar güncellenmeli          |
| i18n key’leri eksiksiz/uyumlu mu?                    | Eksik ya da fazla anahtarlar script/manuel kontrol edilmeli        |

---

## 2️⃣ **Logger & Analitik Standartları**

| Kontrol Noktası                                  | Açıklama                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| Çok dilli log mesajı                             | logger.info/error çağrıları i18n ile üretilmiş olmalı                       |
| Tenant context ile log                           | logger çağrısında mutlaka `...getRequestContext(req)` ile context eklenmeli |
| Zorunlu alanlar (module, event, status, vs.)     | Her logda: tenant, module, event, status, locale, userId, ip vs.            |
| Logger proxy dışında doğrudan tenantLogger YOK   | Modüllerde sadece `logger` proxy ile loglanmalı                             |
| Log dosyaları tenant bazında, rotate edilmiş mi? | `/logs/{tenant}/YYYY-MM-DD.log` altında, 30 gün saklanmalı                  |
| Log düzeyi uygun mu?                             | Başarı: info, hata: error, uyarı: warn gibi doğru seviyeler kullanılmalı    |
| Sabit string/hardcoded log yok                   | Her mesaj i18n ile çekiliyor, asla sabit string yok                         |

---

## 3️⃣ **Tenant Sistemi & Model Injection Standartları**

| Kontrol Noktası                                  | Açıklama                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Her istekte doğru tenant tespiti                 | Header (`x-tenant`), domain veya port üzerinden                                 |
| Her model tenant context’i ile mi üretiliyor?    | Her CRUD’da global model değil, tenant özel model injection ile işlem yapılmalı |
| .env.{tenant} ve tenants.json güncel mi?         | Yeni tenant eklenirken mapping ve env dosyası ekli mi                           |
| Model injection’da schema ile export edilmiş mi? | Model injection’da mutlaka schema kullanılmalı                                  |
| Tenant override sadece superadmin’e açık mı?     | Sadece superadmin `x-tenant` header ile override edebilir, diğerleri edemez     |
| Tenant datası hiçbir şekilde sızdırılmıyor mu?   | Her tenant tamamen izole, başka tenant’ın datasına erişim asla yok              |

---

## 4️⃣ **Kod Yazımında Yapılması/Yapılmaması Gerekenler**

### **YAPILMASI GEREKENLER**

* Her çoklu dil alanı TranslatedLabel olarak tanımla, schema’da otomatik oluştur.
* Tüm create/update işlemlerinde fillAllLocales, mergeLocalesForUpdate kullan.
* Response ve log’larda translate() ile i18n mesaj döndür.
* Logger’da daima context ve modül/event bilgisi ekle.
* Modelleri sadece `await getTenantModels(req)` ile çağır.
* Yeni tenant açılırken tenants.json ve .env.{tenant} dosyasını ekle.
* Tenant override’da superadmin yetkisini kontrol et.
* i18n dosyalarında eksik key/fazlalık otomatik veya manuel kontrol et.

### **YAPILMAMASI GEREKENLER**

* Hiçbir yerde hardcoded string, sabit açıklama kullanma.
* Global mongoose model veya bağlantısı kullanma.
* Logger’a manuel tenant/context girme (getRequestContext otomatik).
* Mapping dışındaki tenantlara override izni verme.
* Eski modül şablonunu doğrudan kopyalamak; context/i18n eklemeyi unutmamak.

---

## 5️⃣ **Self-Review: Otomatik Kontrol Listesi**

* Çoklu dil alanları eksiksiz ve normalize mi?
* Her response ve log’da i18n + context var mı?
* Loglar doğru tenant’a ve klasöre gidiyor mu?
* Validasyon ve hata mesajları locale’a uygun mu?
* Tenant modeli/bağlantısı dışarı sızmıyor mu?
* Yeni tenant ekleme/çıkarma prosedürü eksiksiz mi?
* Tüm yardımcı fonksiyonlar tek noktadan mı import ediliyor?

---

## 6️⃣ **Controller/Modül Şablonu (Minimal)**

```ts
// Controller örneği
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";
import { getTenantModels } from "@/core/middleware/tenant/getTenantModels";
import translations from "./i18n";
import { translate, getLogLocale } from "@/core/utils/i18n/translate";

// Tenant ve locale-aware model çek
const { Product } = await getTenantModels(req);
const t = (key, params) => translate(key, req.locale || getLogLocale(), translations, params);

try {
  // ...işlem
  logger.info(t("create.success"), {
    ...getRequestContext(req),
    module: "product",
    event: "product.create",
    status: "success",
  });
  res.json(...);
} catch (error) {
  logger.error(t("create.fail"), {
    ...getRequestContext(req),
    module: "product",
    event: "product.create",
    status: "fail",
    error,
  });
  res.status(500).json(...);
}
```

---

## 7️⃣ **Denetim/Test (PR/Review Öncesi)**

* [ ] Çoklu dil `TranslatedLabel` tipi tutarlı mı?
* [ ] i18n dosyaları (`tr.json`, `index.ts`) var mı?
* [ ] Tenant modeli injection ile mi çekiliyor?
* [ ] Logger doğru context ve i18n ile mi logluyor?
* [ ] Hardcoded dil/log açıklaması hiç yok mu?
* [ ] Response parseMultilangField ile normalize mi?
* [ ] Tenant mapping/superadmin override kontrolü var mı?

---

## 8️⃣ **Geliştiriciye Not**

> **Bu dokümanı referans aldığın sürece, MetaHub’ın backend’i daima “scalable”, “denetlenebilir”, “future-proof”, “çok dilli” ve “tam tenant-izole” çalışacaktır.
> Kod review ve modül güncellemede sadece bu sayfaya bak, başka dökümana gerek yok!**

---

> Kaynak:
> [MetaHub Multi-Tenant Tenant Standardı](sandbox:/mnt/data/tenant.md)
> [MetaHub Backend Çoklu Dil (i18n) Raporu](sandbox:/mnt/data/i18n.md)
> [MetaHub Logger Standartları](sandbox:/mnt/data/logger.md)
> [MetaHub Checklist](sandbox:/mnt/data/talimat-1.md)

---
