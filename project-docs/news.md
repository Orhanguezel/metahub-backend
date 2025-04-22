Harika, `news` modülü için sağlam bir başlangıç yapılmış. Elindeki backend dosyalarını inceledim (`news.models.ts`, `news.controller.ts`, `news.routes.ts`) ve şimdi bu yapıya uygun frontend için UI planlaması yapabiliriz.

Aşağıda hem yaptığın backend yapılandırmasının değerlendirmesini, hem de frontend UI için nasıl bir yol izleyeceğimizi aşamalı olarak özetliyorum.

---

## ✅ Backend İncelemesi ve Özeti

### 1. `news.models.ts`
- Her haber içeriği çok dilli olarak ayrı belge şeklinde tutuluyor (tekil dil per belge).
- Şu alanlar var:
  - `title`, `content`, `language` (zorunlu alanlar)
  - `image`, `isPublished`, `createdAt`, `updatedAt` gibi mantıklı destekleyici alanlar mevcut.
- `language` default olarak `"en"`.

✅ Model çok temiz ve çok dilli yapı için uygun.

---

### 2. `news.controller.ts`
- CRUD işlemleri var:
  - `createNews`, `getAllNews`, `getNewsById`, `updateNews`, `deleteNews`
- `req.locale` üzerinden dil destekleniyor.
- try/catch içinde `asyncHandler` kullanılmış, hata yönetimi düzgün.
- Görsel yükleme destekli (multer ile dosya var mı kontrolü yapılıyor).

✅ Dosya yükleme ve çoklu dil desteği eksiksiz.

---

### 3. `news.routes.ts`
- Prefix: `/api/news`
- Tüm CRUD endpointleri var.
- `upload.single("image")` ile resim yükleme entegre edilmiş.

✅ Giriş noktaları eksiksiz ve resim destekli.

---

## 🧩 Frontend UI Planı (Admin Panel için)

### 1. Sayfa: `/admin/news/page.tsx`
- Sayfaya iki bileşen eklenecek:
  - `NewsMultiForm.tsx` (çok dilli haber ekleme)
  - `NewsList.tsx` (haber listeleme ve silme)

### 2. Slice: `newsSlice.ts`
- `fetchNews`, `createNews`, `updateNews`, `deleteNews`, `getNewsById`
- Çok dilli destek için `language` parametresi kullanılmalı.
- Redux Toolkit uyumlu, async thunk’lar ile hata yönetimi olacak.

### 3. `NewsMultiForm.tsx`
- `FAQMultiForm.tsx`’teki gibi olacak ama alanlar:
  - `title`, `content`, `language`, `image` (✅ image zorunlu olacak)
- Her dil için ayrı card
- Giriş yapılanlar ✓ ile gösterilecek

### 4. `NewsList.tsx`
- Dil seçimi olacak (`en`, `tr`, `de`)
- Sadece o dile ait haberler gösterilecek
- Silme ve düzenleme butonları olacak
- Edit için modal değil, `NewsMultiForm`'a veri gönderilebilir

---

## 📦 Dosya Yapısı Önerisi

```
src/
├── components/
│   └── admin/
│       └── news/
│           ├── NewsMultiForm.tsx
│           └── NewsList.tsx
├── store/
│   └── newsSlice.ts
├── app/
│   └── admin/
│       └── news/
│           └── page.tsx
```
