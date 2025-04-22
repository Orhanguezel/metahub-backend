# 📦 Ensotek Backend API Dokümantasyonu

Bu dokümantasyon, **Ensotek** için geliştirilen tüm backend modüllerini detaylı şekilde açıklar. Amaç; frontend geliştiricilerin rahatlıkla entegre olabileceği, admin panelden kolay yönetim sağlayacak bir sistem ortaya koymaktır.

---

## 📁 Proje Modül Yapısı (src/routes/index.ts)

| Modül           | Açıklama                                                                 |
|----------------|--------------------------------------------------------------------------|
| `/users`       | Kullanıcı işlemleri (admin ve müşteri)                                   |
| `/appointments`| Randevu alma ve yönetim sistemi                                           |
| `/products`    | Ürün ekleme, düzenleme, listeleme                                         |
| `/orders`      | Sipariş oluşturma ve yönetimi                                            |
| `/blogs`       | Blog yazıları yayınlama, listeleme                                        |
| `/dashboard`   | Admin panel özet verileri (istatistikler)                                 |
| `/cart`        | Kullanıcının alışveriş sepeti işlemleri                                   |
| `/notifications` | Sistem içi bildirimler (sipariş, randevu vs.)                           |
| `/feedbacks`   | Müşteri yorum ve geri bildirimleri                                        |
| `/coupons`     | Kupon tanımlama ve indirim yönetimi                                      |
| `/contacts`    | İletişim formu mesajları                                                  |
| `/settings`    | Genel ayarlar: site başlığı, e-posta, footer bilgileri                    |
| `/faqs`        | Sıkça sorulan sorular                                                     |
| `/gallery`     | Galeri görselleri (masaj ortamları, hizmetler vs.)                        |
| `/stocks`      | Ürün stok takibi                                                          |
| `/payments`    | Ödeme (hazırlık, manuel ödeme tipi tanımı)                                |
| `/account`     | Kullanıcı profil, bildirim, parola, sosyal medya ve görsel işlemleri      |
| `/addresses`   | Çoklu adres yönetimi (ekle, sil, güncelle, getir)                         |
| `/emails`      | E-posta gönderme ve gelen e-posta kutusu yönetimi                         |

---

## 🔐 Authentication & Authorization

- JWT tabanlı kullanıcı doğrulama.
- `/users/login` endpoint’i ile token alınır.
- Admin yetkilendirmesi: `authorizeRoles("admin")` middleware'i kullanılır.

---

## 👤 Kullanıcı (User) Modülü (Admin Panel)

| Endpoint | Yöntem | Açıklama |
|---------|--------|----------|
| `/users` | `GET` | Tüm kullanıcıları getir (admin) |
| `/users/:id` | `GET` | Kullanıcıyı ID ile getir |
| `/users/:id` | `PUT` | Kullanıcıyı güncelle (FormData ile resim dahil) |
| `/users/:id` | `DELETE` | Kullanıcıyı sil |
| `/users/:id/role` | `PUT` | Kullanıcı rolünü güncelle |
| `/users/:id/status` | `PUT` | Kullanıcıyı aktif/pasif yap |

---

## 🧾 Account (Profil Yönetimi)

| Endpoint | Yöntem | Açıklama |
|----------|--------|----------|
| `/account/me` | `GET` | Kullanıcı profil bilgilerini getir |
| `/account/me/update` | `PUT` | Ad, email, telefon, dil güncelle |
| `/account/me/password` | `PUT` | Şifre güncelleme |
| `/account/me/social` | `PATCH` | Sosyal medya bağlantılarını güncelle |
| `/account/me/notifications` | `PATCH` | Bildirim ayarlarını güncelle |
| `/account/me/profile-image` | `PUT` | Profil fotoğrafı yükle (FormData) |
| `/account/me` | `PUT` | Tüm profili tek endpoint ile güncelle |

---

## 🏠 Address (Adres Yönetimi)

| Endpoint | Yöntem | Açıklama |
|----------|--------|----------|
| `/addresses` | `GET` | Kullanıcının tüm adreslerini getir |
| `/addresses` | `POST` | Yeni adres oluştur |
| `/addresses/:id` | `GET` | Belirli adresi getir |
| `/addresses/:id` | `PUT` | Adresi güncelle |
| `/addresses/:id` | `DELETE` | Adresi sil |

---

## 📆 Appointment Modülü

| Endpoint | Yöntem | Açıklama |
|---------|--------|----------|
| `/appointments` | `POST` | Randevu oluştur |
| `/appointments` | `GET` | Tüm randevuları listele (admin) |
| `/appointments/:id` | `GET` | Randevu detayları |
| `/appointments/:id/status` | `PUT` | Randevu durumunu güncelle |
| `/appointments/:id` | `DELETE` | Randevu sil |

---

## 🛍️ Product Modülü

| Endpoint | Yöntem | Açıklama |
|----------|--------|----------|
| `/products` | `GET` | Ürünleri listele |
| `/products/:id` | `GET` | Tekil ürün bilgisi |
| `/products` | `POST` | Ürün oluştur (admin) |
| `/products/:id` | `PUT` | Ürünü güncelle (admin) |
| `/products/:id` | `DELETE` | Ürünü sil (admin) |

---

## 🛒 Order Modülü

| Endpoint | Yöntem | Açıklama |
|----------|--------|----------|
| `/orders` | `POST` | Sipariş oluştur |
| `/orders` | `GET` | Siparişleri listele (admin) |
| `/orders/:id/delivered` | `PUT` | Teslimat durumunu güncelle |
| `/orders/:id` | `PUT` | Siparişi güncelle |

---

## 🧺 Cart Modülü

| Endpoint | Yöntem | Açıklama |
|----------|--------|----------|
| `/cart/add` | `POST` | Sepete ürün ekle |
| `/cart/increase/:productId` | `PUT` | Miktarı artır |
| `/cart/decrease/:productId` | `PUT` | Miktarı azalt |
| `/cart/remove/:productId` | `DELETE` | Ürün çıkar |
| `/cart/clear` | `DELETE` | Sepeti temizle |
| `/cart` | `GET` | Mevcut sepeti getir |

---

## 🧾 Blog Modülü

- Blog yazısı oluştur (admin)
- Başlık, özet, detay, görsel, etiket bilgileri

---

## 📩 E-posta Modülü

| Endpoint | Yöntem | Açıklama |
|----------|--------|----------|
| `/emails/send` | `POST` | Mail gönder |
| `/emails` | `GET` | Gelen kutusu |
| `/emails/fetch` | `POST` | Gelenleri senkronize et |

---

## 🔔 Notification Modülü

| Endpoint | Yöntem | Açıklama |
|----------|--------|----------|
| `/notifications` | `GET` | Bildirimleri getir |
| `/notifications` | `POST` | Bildirim oluştur |
| `/notifications/:id` | `DELETE` | Bildirimi sil |

---

## 📌 Diğer Modüller

- **Services**: Masaj hizmet tanımı
- **Feedbacks**: Yorum yönetimi
- **Gallery**: Ortam görselleri
- **Settings**: Site ayarları
- **Contacts**: İletişim mesajları
- **Faqs**: SSS
- **Coupons**: Kupon sistemi
- **Dashboard**: Admin özet veriler
- **Stocks**: Ürün stokları
- **Payments**: Ödeme tipleri

---

## 📂 Upload Klasörleri

- `uploads/profile-images/`
- `uploads/product-images/`
- `uploads/service-images/`
- `uploads/blog-images/`
- `uploads/gallery-images/`

> ⚠️ Tüm yüklemelerde multer + custom `uploadType` kullanılır.

---

## ✅ Geliştirme Notları

- SCSS modüler yapı
- TypeScript tüm backend yapısında kullanılmakta
- Her model ayrı `interface` ile tanımlı
- Validasyon, hata yönetimi ve hata mesajları özenle düzenlenmiştir
- `.env` ile SMTP, MongoDB, JWT gibi değişkenler yönetilir

---

Frontend geliştiricisi olarak her modülde yukarıdaki endpointlere göre POST, GET, PUT, DELETE işlemlerini rahatlıkla gerçekleştirebilirsin.

---
