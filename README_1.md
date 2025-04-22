# 🧾 Anastasia Massage Backend - Genişletilmiş Doküman

Bu belge, **Anastasia Massage Salon** projesinin **Node.js + TypeScript** tabanlı backend tarafını detaylı bir şekilde açıklar. Amaç, frontend geliştiricisinin, yeni katılan ekip üyelerinin veya API tüketicilerinin sistemin tümünü rahatça anlamasını sağlamaktır.

## ✅ Proje Teknolojileri
- **Node.js** (runtime)
- **Express.js** (API framework)
- **MongoDB** + **Mongoose** (veritabanı)
- **TypeScript**
- **JWT** ile kimlik doğrulama
- **Multer** dosya yükleme
- **SMTP + IMAP** e-posta gönderim / alım
- **dotenv** ile ortam değişkenleri


## 🌐 Global Middleware ve Yapı
- `authMiddleware.ts`: `authenticate`, `authorizeRoles` middleware'leri
- `uploadMiddleware.ts`: Dosya yükleme için (multer konfig)
- `errorMiddleware.ts`: Tüm hata yakalama şemasi


## 🔄 Route Yapısı ve Modüller
Tüm rotalar `/src/routes/index.ts` dosyasından toplanmaktadır.

### 1. **User Modülü** (`/users`)
- Kullanıcı kaydı, giriş, profil, yetkilendirme
- JWT ile token bazlı oturum

### 2. **Account Panel** (`/account`)
- `GET /me` - Profil bilgileri getir
- `PUT /me/update` - Profil güncelleme
- `PUT /me/password` - Şifre değişikliği

### 3. **Appointment Modülü** (`/appointments`)
- `POST /` - Randevu al (public)
- `GET /` - Tüm randevular (admin)
- `PUT /:id/status` - Randevu durumu değiştir
- E-posta bildirimi: Hem admin hem müşteriye
- Bildirim sistemi: admin panelinde notification

### 4. **Product Modülü** (`/products`)
- CRUD, filtreleme, detay görüntüleme
- Çoklu resim yükleme

### 5. **Order Modülü** (`/orders`)
- `POST /` - Sipariş ver (stok düşülür)
- `GET /` - Sipariş listesi (admin)
- `PUT /:id/delivered` - Sipariş teslim edildi işareti
- E-posta bildirimi: müşteriye ve admin'e
- Notification sistemi entegre

### 6. **Cart Modülü** (`/cart`)
- Sepet oluşturma, ürün ekleme-çıkarma
- Miktar artırma, azaltma

### 7. **Service Modülü** (`/services`)
- Masaj hizmetleri CRUD
- Detay, fiyat, süre bilgisi
- Randevularla ilişkili kullanılır

### 8. **Stock Modülü** (`/stocks`)
- Stok CRUD
- Her ürün ile `stockRef` üzerinden ilişkilidir
- Sipariş sırasında miktar azaltma

### 9. **Dashboard** (`/dashboard`)
- Admin için istatistik verisi: Toplam sipariş, kazanc, stok, randevu vs.

### 10. **Blog Modülü** (`/blogs`)
- CRUD yapısında blog sistemi
- Kategori, tag, resim destekli

### 11. **Gallery / File Modülü** (`/gallery`)
- Site görsel galerisi

### 12. **FAQ** (`/faqs`)
- SSS sayfası için basit CRUD

### 13. **Settings** (`/settings`)
- Site ayarlarını admin güncelleyebilir
- Sosyal medya, İletisim, footer, logo vb.

### 14. **Contact Messages** (`/contacts`)
- İletişim formundan gelen mesajlar
- Admin tarafından okunabilir, yanıtlanabilir

### 15. **Email Modülü** (`/emails`)
- **SMTP gönderim:** `sendEmail`
- **IMAP okuma:** Gelen kutusundaki mailleri veritabanına kaydeder
- Admin gelen kutusunu panelden görür

### 16. **Coupon Modülü** (`/coupons`)
- Kod bazlı indirim kuponları
- Kupon kodu, yüzde/para birimi bazlı ındirim

### 17. **Notification** (`/notifications`)
- Her yeni sipariş veya randevu için admin'e notification
- `title`, `message`, `type`, `isRead`

### 18. **Feedback** (`/feedbacks`)
- Kullanıcıdan gelen geribildirimler

### 19. **Payment** (`/payments`)
- Şu an sadece `cash_on_delivery` destekli
- Gelecekte Stripe / PayPal entegresi düşünülmüş


## 📆 Ortam Değişkenleri (.env)
```
PORT=5011
MONGO_URI=...
JWT_SECRET=...
BASE_URL=...

SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=info@...
SMTP_FROM_NAME=Anastasia

IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
IMAP_USER=...
IMAP_PASS=...
```

## ✨ Bonus: Email Template Klasörü (`/templates`)
- `baseTemplate.ts`: Genel HTML şablon
- `appointmentConfirmation.ts`
- `passwordReset.ts`
- `welcome.ts`
- `orderConfirmation.ts`


## 🔧 Gerekiyorsa Postman Test Dosyaları
Tüm modüller için `POSTMAN v2.1` collection JSON'ları mevcut ve kullanıma hazır.

---

Devam etmek istersen frontend tarafının yapısını da buradan planlayabiliriz. Bu belgede eksik olduğunu düş\u00fndüğün kısımlar varsa ekleyebilirim.

Tebrikler, backend mimarisi örnek olacak düzenlikte! 🌟

