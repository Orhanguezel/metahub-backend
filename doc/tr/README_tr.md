
---

# 🌐 MetaHub Backend

MetaHub, çoklu frontend projeleriyle entegre çalışabilen, modüler ve ölçeklenebilir bir **Node.js + TypeScript + MongoDB** tabanlı backend mimarisidir.

> Her frontend projesi için ortak API altyapısı sağlar.  
> Modüller bağımsız olarak geliştirilebilir, etkinleştirilebilir ve Swagger ile belgelenebilir.

---

## 🚀 Özellikler

✅ Çoklu frontend desteği (`.env.metahub`, `.env.kuhlturm`, vb.)  
✅ Modül tabanlı yapı  
✅ Otomatik Swagger üretimi  
✅ Çok dilli içerik yönetimi  
✅ CLI ile hızlı modül üretimi  
✅ PM2, Webhook veya CI/CD ile otomatik deploy  
✅ Jest + Supertest ile test desteği

---

## 🧱 Teknolojiler

- **Node.js (Bun runtime)**
- **Express**
- **TypeScript**
- **Mongoose**
- **Zod (Validation)**
- **Swagger UI**
- **Jest + Supertest** (Test)
- **dotenv**, **fs**, **path**, **ts-node** vb.

---

## 📁 Proje Yapısı (Özet)

```
src/
├── modules/         # Her modül izole bir klasörde
├── scripts/         # CLI araçları (örnek: createModule, metaValidator)
├── core/            # Ortak yapılandırmalar (auth, middleware, logger)
├── tools/           # Yardımcı fonksiyonlar
├── server.ts        # Express sunucu
```

---

## 🛠️ Kurulum

```bash
bun install
bun run dev
```

Varsayılan olarak `.env.metahub` yüklenir. Diğer profiller için:

```bash
APP_ENV=kuhlturm bun run dev
```

---

## 🧪 Test

```bash
bun test
```

---

---

## 📘 Belgeler (Türkçe)

| Dosya | Açıklama |
|-------|----------|
| [`CLI_TOOLS.md`](./doc/CLI_TOOLS.md) | CLI araçları ile modül oluşturma ve meta doğrulama |
| [`DEPLOYMENT.md`](./doc/DEPLOYMENT.md) | Ortam kurulumu ve dağıtım (deploy) adımları |
| [`META_SYSTEM.md`](./doc/META_SYSTEM.md) | Meta yapı sistemi ve kullanım senaryoları |
| [`MODULE_GUIDE.md`](./doc/MODULE_GUIDE.md) | Modül yapısı, geliştirme rehberi ve yaşam döngüsü |
| [`MULTILINGUAL.md`](./doc/MULTILINGUAL.md) | Çok dilli içerik yönetimi ve stratejisi |
| [`SWAGGER_SETUP.md`](./doc/SWAGGER_SETUP.md) | Swagger UI kurulumu ve yapılandırması |
| [`ROADMAP.md`](./doc/ROADMAP.md) | Proje yol haritası ve versiyon planlaması |

---

## 🧠 Katkı Sağlamak

Modül geliştirmek istiyorsan:

```bash
bun run scripts/createModule.ts mymodule
```

Ardından `metaValidator` ile doğrulama:

```bash
bun run scripts/metaValidator.ts
```

---

## 📌 Notlar

- Swagger UI: [http://localhost:5014/api-docs](http://localhost:5014/api-docs)  
- Swagger JSON: [http://localhost:5014/swagger.json](http://localhost:5014/swagger.json)
- MongoDB bağlantı ayarları `.env.*` dosyalarında tanımlıdır.
- Ortak modül şemaları Swagger’dan otomatik alınır.

---

Bir sonraki belgeyi seçebilirsin:

- `META_SYSTEM.md` ✅
- `MODULE_GUIDE.md` ✅
- `MULTILINGUAL.md` ✅
- `SWAGGER_SETUP.md` ✅
- `DEPLOYMENT.md` ✅
- `CLI_TOOLS.md` ✅  
- **✅ README.md** de tamamlandı.
