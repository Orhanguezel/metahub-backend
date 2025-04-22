
### `README.md`

```md
# 🧠 MetaHub Backend

TypeScript tabanlı, modüler ve genişletilebilir bir Node.js backend yapısıdır. Çok sayıda modül içerir ve farklı projelerde yeniden kullanılabilir bir altyapı sağlar.

## 🚀 Projeye Genel Bakış

- **Dil**: TypeScript
- **Sunucu**: Express.js
- **Veritabanı**: MongoDB (Mongoose)
- **Gerçek Zamanlı**: Socket.IO
- **E-Posta**: Nodemailer
- **JWT Auth**: Access & Refresh token destekli
- **Upload**: `uploads/` klasörüne dosya kaydı
- **Servis Yapısı**: Service-Controller-Route yapısı
- **Çoklu Ortam Desteği**: `.env.metahub`, `.env.kuhlturm` gibi env varyantları desteklenir.

## 🗂️ Klasör Yapısı

```
src/
├── core/                # Çekirdek config'ler ve helper'lar
├── modules/             # Her modül kendi içinde controller/model/route içerir
│   ├── blog/
│   │   ├── blog.controller.ts
│   │   ├── blog.models.ts
│   │   └── blog.routes.ts
        └── index.ts
│   ├── auth/
│   ├── cart/
│   ├── ...
├── routes/──index.ts   # Ana router yönlendirmeleri
├── services/            # Harici servisler (ör. Email)
├── socket/              # WebSocket (Socket.IO) mantığı
├── templates/           # E-posta veya PDF şablonları
├── types/               # Global TypeScript tanımlamaları
├── server.ts            # Uygulamanın giriş noktası
```

## 🛠️ Kurulum

```bash
# Bağımlılıkları yükle
bun install      # ya da npm install

# .env dosyasını oluştur
cp .env.example .env

# Projeyi başlat (dev)
bun run dev      # ya da npm run dev
```

> `bun` kullanıyorsan `bun.lock` zaten eklenmiş. Alternatif olarak `npm` veya `yarn` da kullanılabilir.

## 🌐 API Endpoints

Tüm API rotaları `src/modules` klasörü içinden otomatik olarak `routes/index.ts` üzerinden `server.ts`'e bağlanır.

Örnek:
```http
POST /api/auth/register
GET  /api/blog
POST /api/order
```

## 🔐 Authentication

- JWT tabanlı kimlik doğrulama
- `accessToken` & `refreshToken` desteği
- HTTP-only cookie ile güvenli token iletimi

## 📦 Önemli Scriptler

```bash
# Dev modda başlat
bun run dev

# Build al
bun run build

# Production
bun run start
```

## 📁 Ortam Dosyaları

`.env.metahub`, `.env.kuhlturm` gibi farklı ortamlar için yapı desteklenir.

### `.env.example` örneği:
```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/metahub
JWT_SECRET=supersecret
EMAIL_HOST=smtp.example.com
EMAIL_USER=info@example.com
EMAIL_PASS=password
```

## 🧪 Testler & Araçlar

> 

## 💡 Geliştirici Notları

- Modül mimarisi sayesinde her yeni özellik bir modül olarak eklenebilir.
- Ortak backend olarak yapılandırılmıştır, birden fazla frontend ile uyumlu çalışabilir.
- `.gitignore` dosyasına `.env*`, `node_modules/`, `dist/`, `.next/` gibi dizinler eklenmiştir.

## 👥 Katkıda Bulunmak

1. Forkla 🍴
2. Branch oluştur (`git checkout -b feature/xyz`)
3. Commit et (`git commit -m 'add xyz'`)
4. Push et (`git push origin feature/xyz`)
5. Pull request gönder 🚀

