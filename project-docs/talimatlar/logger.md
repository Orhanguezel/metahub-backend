
---

# 🚀 **MetaHub Multi-Tenant Logger Standartları**

---

## 1. **Genel Yapı & Amaç**

* **Her tenant’ın kendi log dosyası** ve kendi log klasörü olur (`/logs/{tenant}/`).
* **Her log kaydı**, şu bilgileri minimum içerir:

  * `tenant`
  * `module`
  * `event`
  * `status`
  * `locale`
  * `message` (çok dilli, i18n ile çevrilen)
  * (opsiyonel: userId, ip, query, vs.)
* **Loglar**, hem dosyaya hem terminale (development’da renkli, prod’da JSON) yazılır.
* **Log dosyaları günlük rotate edilir** (`YYYY-MM-DD.log`), eski loglar arşivlenir.

---

## 2. **Ana Dosyalar ve Sorumlulukları**

* **`tenantLogger.ts`**
  Her tenant için ayrı bir Winston logger instance’ı oluşturur.
  Dosya, günlük rotate, hatalar için ayrı log, konsol vs.
* **`logger.ts`**
  Tüm modüllerde kullanılması gereken ana logger proxy’si.
  Otomatik olarak ilgili tenant logger’a yönlendirir.
* **`logRequestContext.ts`**
  Her request’in tenant, user, ip, geo, locale gibi context bilgisini üretir.
* **`analyticsLogger.ts`**
  Hem analitik kayıt (DB) hem tenant bazlı log kaydı atar.
* **`index.ts`**
  Tüm logger yardımcılarını dışa aktarır, modüller tek import’la logger’a ulaşır.

---

## 3. **Logger Kullanım Standardı**

### **A) Modüllerde Kullanım**

Her modülde:

```js
import logger from "@/core/middleware/logger/logger";
import { getRequestContext } from "@/core/middleware/logger/logRequestContext";

export const createSomething = async (req, res) => {
  const context = getRequestContext(req);
  const t = (key, params) =>
    translate(key, req.locale, translations, params); // ÇOK DİLLİ MESAJ

  try {
    // ...işlem

    logger.info(t("create.success"), {
      ...context,
      module: "product",
      event: "product.create",
      status: "success",
      // ekstra data
    });

    res.json({ ... });
  } catch (error) {
    logger.error(t("create.fail"), {
      ...context,
      module: "product",
      event: "product.create",
      status: "fail",
      error,
    });
    res.status(500).json({ ... });
  }
};
```

**Her zaman:**

* Çok dilli mesaj kullanılır (`translate()` veya i18n key)
* Context her zaman eklenir (tenant, user, ip, locale vs)
* Log düzeyi (`info`, `warn`, `error`) doğru seçilir

---

### **B) Logger’dan Doğru Tenant’a Yazma**

Kullandığın logger proxy (`logger.ts`), tenant bilgisini global context veya request’ten otomatik çeker:

* Her log **doğru tenant’ın dosyasına** yazılır.
* Her tenant kendi loglarına izole erişir.

---

### **C) Her Modülde Zorunlu Alanlar**

| Alan      | Açıklama                     |
| --------- | ---------------------------- |
| tenant    | İşlem yapılan tenant         |
| module    | Hangi modül/feature          |
| event     | Hangi event/endpoint         |
| status    | "success", "fail", "warning" |
| locale    | İstek dil bilgisi            |
| message   | Çok dilli, i18n ile üretilen |
| userId    | İsteği atan kullanıcı        |
| ip        | Kullanıcının ip adresi       |
| timestamp | Otomatik ekleniyor           |

---

## 4. **Çok Dilli Log Mesajı**

* **Hiçbir yerde sabit string/hardcoded mesaj kullanılmaz.**
* Her log mesajı i18n üzerinden (`translate(key, locale, translations, params)`) üretilir.
* Her modülün `/i18n/` altında log mesajları anahtar olarak bulunur:

  ```json
  {
    "create": {
      "success": "Ürün başarıyla eklendi.",
      "fail": "Ürün eklenirken hata oluştu."
    },
    "update": {
      "success": "Güncelleme başarılı.",
      "fail": "Güncelleme sırasında hata oluştu."
    }
  }
  ```

---

## 5. **Dosya Rotasyonu & Arşiv**

* Her tenant’ın log dosyaları `/logs/{tenant}/YYYY-MM-DD.log` altında günlük rotate edilir.
* Error log’ları ayrı dosyada tutulur.
* 30 gün geriye dönük log saklanır (`maxFiles: "30d"`).
* Büyük dosyalar bölünür (`maxSize: "50m"`).

---

## 6. **Terminal & Dosya Farkı**

* Development’da terminalde renkli, okunabilir log;
* Production’da JSON formatında dosya + error.log ayrı tutulur.

---

## 7. **Analytics Logger ile Log Standartları**

* Tüm analytics olayları hem DB’ye hem tenant log dosyasına kaydedilir.
* Hangi kullanıcı, hangi tenant, hangi endpoint, hangi lokasyon/cihaz, hangi event gibi tüm detaylar context’e eklenir.

---

## 8. **Logger’ın Modüllerle Kullanımı (Best-Practice)**

### **Her modülde:**

* `logger.info()`, `logger.error()` çağrısı yapılırken;

  * **Çok dilli mesaj**
  * **Context** (getRequestContext)
  * **module**, **event**, **status** alanları mutlaka eklenir.

### **KÖTÜ:**

```js
logger.info("Kullanıcı eklendi"); // ❌ Hardcoded, tenant context yok
```

### **İYİ:**

```js
logger.info(t("create.success"), {
  ...getRequestContext(req),
  module: "user",
  event: "user.create",
  status: "success",
});
```

---

## 9. **Logger Proxy & Otomasyon**

* Tüm logger fonksiyonları otomatik olarak ilgili tenant’a yönlendirilir.
* Modüllerin direkt `logger.info()` kullanması yeterlidir, hangi tenant’ta olduğu arka planda otomatik çözülür.

---

## 10. **Sorun & İyileştirme Notları**

* Kodlarında **logger ve context injection tamamen hazır**.
* Sadece eski modüllerde log mesajı/string hardcoded olabilir, onları i18n + context ile güncelle.
* Terminalde hata görüyorsan, logger seviyelerini kontrol et.
* Çok nadir bir durumda tenant context doğru geçmeyebilir; global veya request bazında tenant bilgisinin doğru aktarıldığına emin ol.

---

## 11. **Standart Güncelleme & Checklist**

Her modül aşağıdaki adımlara uymalı:

| Kontrol                           | Açıklama                          |
| --------------------------------- | --------------------------------- |
| Çok dilli log mesajı (i18n)       | Sabit string yok, hep translate   |
| Tenant context ile log            | logger çağrısı context ile        |
| Zorunlu alanlar: module, event... | Her logda mutlaka olmalı          |
| Sadece logger proxy kullanılmalı  | Modülde doğrudan tenantLogger yok |
| Log dosyaları tenant bazında      | Her tenant için ayrı dosya        |

---

# **Kısa Özet / TL;DR**

* Her tenant izole log klasöründe, JSON, rotate edilen dosyada loglanır.
* Her log entry çok dilli, i18n ve context aware olmalı.
* Modüller **sadece logger proxy** kullanmalı, context injection ve i18n zorunlu.
* Tüm hata/success loglarında tenant, module, event, status, user, ip, locale zorunlu alan!
* Hiçbir yerde hardcoded açıklama/log mesajı yok!

---

**Sistem bu standarda uygun olduğu sürece, enterprise seviye denetlenebilir, çok dilli, tenant izole ve güvenli bir log altyapısına sahip olursun.**

---

## İyileştirme/ekstra:

* `logger.warn`/`logger.debug` seviyelerine de aynı context injection uygulanabilir.
* Logger’ı OpenSearch/Splunk gibi harici sistemlere de yönlendirebilirsin (ilerisi için).
* Logların frontend panelde gösterilmesi veya e-posta uyarısı gibi advanced modüller ekleyebilirsin.

---
