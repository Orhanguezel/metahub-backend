<<<<<<< HEAD

## 🚀 Ensotek Backend

Ensotek, **soğutma kuleleri üretimi** alanında hizmet veren bir fabrikanın tüm iş süreçlerini kapsayan bir web sistemidir. Bu repository, sistemin **Node.js + Express + MongoDB + TypeScript** tabanlı RESTful API (backend) uygulamasını içerir.

### 📦 Teknolojiler

- **Node.js** + **Express.js**
- **TypeScript**
- **MongoDB** + **Mongoose**
- **JWT** Authentication (httpOnly cookie ile)
- **Multer** ile dosya yükleme
- **i18n destekli altyapı**
- **Role-Based Access Control (RBAC)**
- **RESTful API** mimarisi
- **Modüler dosya yapısı**

---

## 📁 Proje Yapısı

```
src/
├── config/               # Veritabanı bağlantısı, CORS, env
├── controllers/          # Tüm modüllere ait iş mantığı
│   └── user/             # Auth, profile, crud, status
├── middleware/           # Auth, error handler, upload
├── models/               # Mongoose veri modelleri
├── routes/               # Express router modülleri
├── services/             # E-posta, auth gibi servis katmanları
├── templates/            # Mail HTML şablonları
├── utils/                # Yardımcı fonksiyonlar
└── server.ts             # Uygulamanın giriş noktası
```

---

## 🔐 Kimlik Doğrulama

- JWT tabanlı token doğrulama
- httpOnly cookie ile güvenli oturum
- Role-based yetkilendirme: `"admin" | "moderator" | "user" | "staff" | "customer"`

---

## 📚 API Modülleri

| Modül | Açıklama |
|-------|----------|
| **Auth / Account** | Giriş, kayıt, şifre değişimi, profil güncelleme |
| **User Management** | Admin taraflı kullanıcı işlemleri (CRUD, statü, rol değişimi) |
| **Products** | Ürün ekleme, stok ilişkisi, kategori |
| **Orders / Payments** | Sipariş oluşturma, ödeme işlemleri, teslim durumu |
| **Cart** | Sepet işlemleri (ekle, çıkar, artır, temizle) |
| **Blog / News / Articles** | İçerik modülleri, yorumlarla birlikte |
| **References / Library / Gallery** | Kurumsal modüller: referanslar, dökümanlar, medya |
| **Feedback / FAQ / Comments** | Ziyaretçi içerikleri, yönetim panelinden kontrol |
| **Dashboard** | Admin paneli istatistikleri |
| **Notifications / Settings** | Bildirim sistemi, sistem ayarları |
| **Contact / Email** | İletişim formları ve gelen kutusu (SMTP desteğiyle) |

---

## 🌍 Çok Dilli Altyapı

- Tüm içerikler `language: "tr" | "en" | "de"` alanı ile dil bilgisi içerir
- API tarafı dil filtresi ile çalışır (`req.locale`, `req.query.lang`)
- Admin paneli üzerinden çok dilli içerik yönetimi mümkündür

---

## ⚙️ Kurulum

```bash
# Bağımlılıkları yükle
bun install

# .env dosyasını oluştur
cp .env.example .env

# Sunucuyu başlat
bun run dev
```

---

## 🔐 .env Örnek Yapı

```
PORT=5015
MONGODB_URI=mongodb://localhost:27017/ensotek-db
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3000
BASE_URL=http://localhost:5015
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=info@ensotek.de
SMTP_PASS=your_email_password
SMTP_FROM="Ensotek"
```

---

## 🧪 Test & Postman

- Postman koleksiyonu `tests/Ensotek.postman_collection.json` olarak hazırdır
- Testler aşağıdaki modülleri içerir:
  - Login/Register
  - Ürün işlemleri
  - Sepet / Sipariş
  - Tüm CRUD endpoint'leri
  - Mail ve Bildirim testleri

---

## 📦 Build & Deployment

```bash
bun run build       # dist klasörüne derler
bun run start       # production ortamı için başlat
```

PM2 veya Docker ile deployment yapılabilir.

---

## 🤝 Katkı ve Geliştirme

Yapı modülerdir ve her modül ayrı `model`, `controller`, `route` ve `slice` yapısına sahiptir. Yeni modül eklemek için:

1. Model (`models/`)
2. Controller (`controllers/`)
3. Route (`routes/`)
4. Gerekirse `slice`, `service`, `template`

eklendiğinde sistem otomatik olarak çalışır.

---

## 📧 İletişim

📨 E-posta: `info@ensotek.de`  
🌐 Web: [ensotek.de](https://ensotek.de)  

---

Hazırsan bu `README.md` dosyasını kök dizine kaydedebiliriz. İstersen `Postman` dosyasını da buna ekleyebilirim. Nasıl ilerleyelim?
=======
# metahub-backend
metahub-backend
>>>>>>> f2e45f064cced30f52305fed018dd9c53d5f49b6
