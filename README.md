
---

# 🌐 MetaHub Backend

MetaHub ist eine modulare und skalierbare Backend-Architektur auf Basis von **Node.js + TypeScript + MongoDB**, die mit mehreren Frontend-Projekten integriert werden kann.

> Bietet eine gemeinsame API-Infrastruktur für alle Frontend-Projekte.  
> Module können unabhängig entwickelt, aktiviert und mit Swagger dokumentiert werden.

---

## 🚀 Funktionen

✅ Unterstützung für mehrere Frontend-Projekte (`.env.metahub`, `.env.kuhlturm` usw.)  
✅ Modulbasierte Architektur  
✅ Automatische Swagger-Generierung  
✅ Mehrsprachiges Inhaltsmanagement  
✅ Schnelle Modulerstellung mit CLI  
✅ Automatisches Deployment via PM2, Webhook oder CI/CD  
✅ Testunterstützung mit Jest + Supertest

---

## 🧱 Technologien

- **Node.js (Bun Runtime)**
- **Express**
- **TypeScript**
- **Mongoose**
- **Zod (Validierung)**
- **Swagger UI**
- **Jest + Supertest** (Tests)
- **dotenv**, **fs**, **path**, **ts-node** usw.

---

## 📁 Projektstruktur (Übersicht)

```
src/
├── modules/         # Jedes Modul in einem eigenen Ordner
├── scripts/         # CLI-Skripte (z. B. createModule, metaValidator)
├── core/            # Gemeinsame Konfigurationen (auth, middleware, logger)
├── tools/           # Hilfsfunktionen
├── server.ts        # Express-Server
```

---

## 🛠️ Installation

```bash
bun install
bun run dev
```

Standardmäßig wird `.env.metahub` geladen. Für andere Umgebungen:

```bash
APP_ENV=kuhlturm bun run dev
```

---

## 🧪 Tests

```bash
bun test
```

---


## 📘 Dokumentation (Almanca)

| Datei | Beschreibung |
|-------|--------------|
| [`CLI_TOOLS.md`](./doc/CLI_TOOLS.md) | CLI-Tools zur Modulerstellung und Validierung |
| [`DEPLOYMENT.md`](./doc/DEPLOYMENT.md) | Anleitung zur Einrichtung und zum Deployment |
| [`META_SYSTEM.md`](./doc/META_SYSTEM.md) | Erklärung des Metadaten-Systems |
| [`MODULE_GUIDE.md`](./doc/MODULE_GUIDE.md) | Modulerstellung und Lifecycle |
| [`MULTILINGUAL.md`](./doc/MULTILINGUAL.md) | Mehrsprachigkeitsstrategie |
| [`SWAGGER_SETUP.md`](./doc/SWAGGER_SETUP.md) | Swagger-Konfiguration und Einrichtung |
| [`ROADMAP.md`](./doc/ROADMAP.md) | Projektfahrplan und Versionsübersicht |
---

## 🧠 Beitrag leisten

Ein neues Modul erstellen:

```bash
bun run scripts/createModule.ts mymodule
```

Dann mit `metaValidator` prüfen:

```bash
bun run scripts/metaValidator.ts
```

---

## 📌 Hinweise

- Swagger UI: [http://localhost:5014/api-docs](http://localhost:5014/api-docs)  
- Swagger JSON: [http://localhost:5014/swagger.json](http://localhost:5014/swagger.json)  
- MongoDB-Verbindungsdetails sind in den `.env.*` Dateien definiert  
- Gemeinsame Modul-Schemas werden automatisch aus Swagger geladen

---

MÜKEMMEL BİR STRATEJİ! 🎯  
Her şey sıralı ve temiz ilerliyor.

Şimdi o zaman önce:  
# 📄 **Proje Readme (Backend) yazıyoruz.**

Ben sana şimdi tam bir **örnek** çıkartıyorum.  
Bunu ister `.md` dosyasına yazarsın, ister doğrudan GitHub veya projenin içine koyarız.

---

# 🚀 MetaHub Backend - Proje Readme

## 📚 Proje Hakkında
Bu proje, **MetaHub** adında modüler bir RESTful API backend sistemidir.  
Yapı tamamen **TypeScript**, **Express.js**, **Mongoose** ve gelişmiş bir **Meta ve Swagger üretim sistemi** ile desteklenmiştir.

## 📦 Ana Özellikler
- ✅ Her modül için otomatik meta veri üretimi (`generate:meta`)
- ✅ Swagger dokümantasyonu (otomatik üretiliyor)
- ✅ Çoklu ortam desteği (ENV: `.env.metahub`, `.env.admin` vb.)
- ✅ Dinamik modül yönetimi (`ENABLED_MODULES`)
- ✅ Modül başına versiyonlama ve commit hash takibi
- ✅ Express-validator tabanlı otomatik validation şeması çıkarımı
- ✅ MongoDB bağlantısı ve modele dayalı yapı
- ✅ Git kullanıcı adı ve commit hash ile değişim kayıtları
- ✅ API Token Authentication (JWT)

---

## ⚙️ Kurulum

1. **Repository'yi Klonla**
```bash
git clone https://github.com/your-repo/metahub-backend.git
cd metahub-backend
```

2. **Gereklilikler**
```bash
bun install
# veya
npm install
```

3. **ENV Dosyalarını Ayarla**
Örnek `.env.metahub` dosyası:
```bash
APP_ENV=metahub
PORT=5014
MONGO_URI=mongodb://localhost:27017/metahub
ENABLED_MODULES=users,products,orders,...
SWAGGER_BASE_URL=http://localhost:5014/api
PROJECT_NAME=MetaHub API
PROJECT_DESCRIPTION=Comprehensive API for MetaHub project
```

4. **Meta Dosyalarını Üret**
```bash
bun run generate:meta
# veya
npm run generate:meta
```

5. **Projeyi Başlat**
```bash
bun run dev
# veya
npm run dev
```

---

## 🛠 Kullanılan Scriptler

| Komut               | Açıklama                                               |
|---------------------|---------------------------------------------------------|
| `bun run build`      | Projeyi derler (TypeScript -> JavaScript)               |
| `bun run start`      | Build edilmiş projeyi başlatır (`dist/server.js`)       |
| `bun run dev`        | Meta generate eder, dev server başlatır (`ts-node`)     |
| `bun run generate:meta` | Tüm modüller için yeni `.meta.json` dosyaları oluşturur |

---

## 🧠 Meta Generate Sistemi

**Meta sistemi**, `/modules` klasöründeki tüm modülleri tarar:
- İlgili `.routes.ts` dosyalarından rota bilgilerini çıkarır
- Eğer varsa ilgili `.validation.ts` dosyasından **request body** şemasını çıkarır
- Versiyonu otomatik artırır (patch +1)
- Git kullanıcı adını (`user.name`) ve son commit hash'ini (`git rev-parse HEAD`) ekler
- Tarih bilgisi (`lastUpdatedAt`) ve tarihçe (`history`) kayıtları tutar

Meta örneği:
```json
{
  "version": "1.0.4",
  "updatedBy": {
    "username": "orhan",
    "commitHash": "ab12cd34..."
  },
  "lastUpdatedAt": "2025-04-26T19:45:00.000Z",
  "commitHash": "ab12cd34...",
  "history": [
    {
      "version": "1.0.4",
      "by": "orhan",
      "commitHash": "ab12cd34...",
      "date": "2025-04-26T19:45:00.000Z",
      "note": "Meta auto-generated"
    }
  ],
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "auth": true,
      "summary": "Get all users",
      "body": { ...validationSchema }
    }
  ]
}
```

---

## 📖 Swagger API

- Swagger otomatik olarak üretilir.
- `ENABLED_MODULES` içindeki aktif modüllerin API endpointleri gösterilir.
- Swagger erişim adresi:
  ```
  http://localhost:5014/api-docs
  ```
- `swagger.json` dosyası:
  ```
  http://localhost:5014/swagger.json
  ```

---

## 📦 Proje Yapısı

```bash
src/
├── core/                # Temel ayarlar (config, auth, error handler, middleware)
├── modules/             # Her modülün controller, model, routes, validation dosyaları
├── meta-configs/        # Üretilen .meta.json dosyaları
├── scripts/             # Meta generate, embed FAQ gibi script dosyaları
├── server.ts            # Ana Express server dosyası
└── generateMeta.ts      # Meta oluşturma entry point
```

---

## 🧹 Modül Eklerken Dikkat Edilmesi Gerekenler

1. `/modules/{module}` dizininde `.routes.ts`, `.controller.ts`, `.model.ts`, `.validation.ts` dosyaları olmalıdır.
2. Rotalar standart olmalıdır:  
   ```ts
   router.post("/", validateCreateUser, createUser);
   ```
3. Validation dosyası **express-validator** ile yazılmalıdır.

4. Yeni modülü **ENABLED_MODULES** env değişkenine eklemeyi unutmayın.

---

## 💬 Katkı Sağlama
- Kod standartlarına uyun.
- Commit mesajlarınızı kısa ve açıklayıcı yazın.
- PR açmadan önce `bun run generate:meta` komutunu çalıştırın.

---

# 🎯 Sonuç

Bu yapı sayesinde:
- Modüller bağımsız ve yönetilebilir.
- Swagger ve meta bilgileri her zaman güncel kalır.
- Proje ölçeklenebilir ve yeni modüller kolay eklenebilir.
- Git bilgisiyle izlenebilirlik sağlanır.

---

# ✅ Şimdi ne yapıyoruz?
✅ Readme bitti.  
▶️ Şimdi sıradaki adım: **Admin Modülünü güncellemek.**

---

Sana ister `.md` dosyası olarak da formatlayıp verebilirim.  
**İster misin doğrudan `README.md` formatında çıktı vereyim?** 🚀  
(Sadece "evet" de yeter.)