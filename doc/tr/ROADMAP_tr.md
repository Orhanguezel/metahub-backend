
---

# 🗺️ MetaHub Backend Roadmap

Bu yol haritası, MetaHub Backend projesinin sürümler bazında gelişimini takip etmeye ve planlamaya yöneliktir. Versiyonlar "dokümantasyon + özellikler + altyapı" olmak üzere üç eksende ilerleyecek şekilde organize edilmiştir.

---

## ✅ **v1.0 – Stabil Temel (Tamamlandı)**

### 🧩 Özellikler
- Modüler backend mimarisi
- Mongoose + Zod + Express + TypeScript uyumu
- Çoklu frontend desteği (`.env.metahub`, `.env.kuhlturm`)

### 📘 Dokümantasyon
- [x] `README.md`
- [x] `CLI_TOOLS.md`
- [x] `META_SYSTEM.md`
- [x] `MODULE_GUIDE.md`
- [x] `MULTILINGUAL.md`
- [x] `SWAGGER_SETUP.md`
- [x] `DEPLOYMENT.md`

### 🔧 Altyapı
- Swagger UI kurulumu
- Meta otomasyonu
- Modül üretim scripti (`createModule`)
- Meta doğrulama scripti (`metaValidator`)
- PM2 + Webhook deploy sistemi

---

## 🚧 **v1.1 – Geliştirme & Otomasyon (Planlanıyor)**

### 🎯 Amaç
- Swagger'ın `body`, `response`, `formType` gibi alanlarla zenginleştirilmesi
- Testlerin otomatik hale getirilmesi
- Meta sistemini admin panel üzerinden güncellenebilir yapmak

### Planlanan Özellikler
- [ ] `requestBody` şemalarının Swagger'a otomatik eklenmesi
- [ ] `formType`: `json` / `form-data` ayrımı
- [ ] `response` şemalarının tanımı
- [ ] Swagger `definitions` alanı desteği
- [ ] `ModulePermission` yapısı (`canCreate`, `canDelete` vs.)

### Geliştirme Scriptleri
- [ ] `delete:module` → modülü ve meta dosyasını sil
- [ ] `generate:form` → form şeması oluştur
- [ ] `sync:admin` → meta → DB güncelleme

---

## 🔮 **v1.2 – CI/CD & Admin UI Entegrasyonu (İleri Aşama)**

### 📦 Özellikler
- [ ] GitHub Actions ile CI/CD pipeline
- [ ] Test coverage raporlaması
- [ ] Her ortam için versiyonlama (örnek: `.env.metahub` için `1.2.0`)

### 🛠️ Admin Panel
- [ ] Meta verilerini UI üzerinden düzenleme
- [ ] Aktif modülleri admin panelden etkinleştirme
- [ ] Swagger linklerini gösterme

---

## 📌 Uzun Vadeli Planlar

| Alan | Açıklama |
|------|----------|
| 🌐 Uluslararası panel yönetimi | Admin UI'nin de çok dilli olması |
| 🔍 Gelişmiş loglama | Ortam bazlı log, error tracker (örnek: Sentry) |
| 📊 Modül analitiği | Hangi endpoint ne kadar kullanılmış gibi istatistikler |
| 🔐 RBAC destekli erişim | Route seviyesinde yetki kontrolü |
| 🧪 Otomatik test veri üretimi | Dummy data generator modülü |

---

## 🔁 Sürüm Takibi

| Sürüm | Durum | Tarih | Açıklama |
|-------|-------|-------|----------|
| `v1.0` | ✅ Yayında | Nisan 2025 | Tüm temel yapı ve dökümantasyon tamamlandı |
| `v1.1` | 🛠️ Planlanıyor | Mayıs 2025 | Swagger ve meta sistemini genişletme |
| `v1.2` | 🧠 Taslak | Haziran 2025+ | CI/CD ve admin panel entegrasyonu |

---

