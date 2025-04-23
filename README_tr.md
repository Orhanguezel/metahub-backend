
```markdown
# 📦 MetaHub Backend

MetaHub, modüler ve ölçeklenebilir bir Node.js + Express.js tabanlı backend mimarisidir. Proje TypeScript ile yazılmıştır ve Zod, Swagger, MongoDB gibi modern teknolojilerle desteklenmiştir.

## 📁 Proje Yapısı

```
metahub-backend/
├── src/
│   ├── core/               # Ortak yapılandırmalar, middleware'ler, helper fonksiyonlar
│   │   ├── config/         # .env yükleyici, Mongo bağlantısı, JWT ayarları
│   │   ├── middleware/     # locale, auth, error handler middleware
│   │   ├── swagger/        # Swagger setup ve meta'dan spec üretimi
│   │   └── utils/          # Regex, Zod schema'lar, yardımcı fonksiyonlar
│   ├── modules/            # Tüm modüler işlevler burada
│   │   └── blog/           # Örnek modül: blog.controller.ts, blog.routes.ts, blog.models.ts
│   ├── meta-configs/       # Otomatik üretilen meta dosyalar (.meta.json)
│   └── server.ts           # Ana Express uygulaması
├── .env.metahub            # Ortam yapılandırması
├── package.json
└── tsconfig.json
```

## 🚀 Başlangıç

```bash
bun install
bun run dev
```

## 🔌 Ortam Değişkenleri

`.env.metahub` dosyası örneği:

```env
PORT=5014
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

ACTIVE_META_PROFILE=metahub
META_CONFIG_PATH=src/meta-configs/metahub
ENABLED_MODULES=blog,product,order,...
PROJECT_NAME=MetaHub
SWAGGER_ROUTE=/api-docs
SWAGGER_BASE_URL=http://localhost:5014/api
```

## 🧩 Modüler Yapı

Her modül `modules/` klasörü altında bulunur ve şu 3 dosyaya sahiptir:

- `modulename.controller.ts`
- `modulename.routes.ts`
- `modulename.models.ts`

Eğer bu üç dosya varsa, `index.ts` otomatik oluşturulur.

## 🧠 Meta Sistem

- `generateMeta.ts` script'i sayesinde her modül için bir `.meta.json` dosyası oluşturulur.
- Swagger UI bu meta dosyalara göre dinamik olarak dokümantasyon üretir.

```bash
bun run generate:meta
```

## 🧾 Swagger UI

Tüm API endpoint'leri Swagger üzerinden test edilebilir.

📘 Swagger UI: [http://localhost:5014/api-docs](http://localhost:5014/api-docs)

## 🔐 Kimlik Doğrulama

- JWT tabanlı kimlik doğrulama yapılır
- `authenticate` middleware aktif olan tüm route'larda zorunludur
- Swagger'da `Authorize` butonu ile token test edilebilir

## 🧪 Test & Geliştirme

- Swagger ile test edilebilir
- Postman collection dosyası opsiyoneldir
- Zod ile request doğrulama yapılabilir (hazırlık aşamasında)

## 👥 Ekip Geliştirme İçin

- Modül sayısı arttıkça sistem karmaşıklaşmaz
- Swagger otomatik güncellenir
- Meta sistemi sayesinde frontend takımı için API görünürlüğü artar

---

> Daha fazla bilgi ve katkı için: [orhanguzell@gmail.com](orhanguzell@gmail.com)

```
