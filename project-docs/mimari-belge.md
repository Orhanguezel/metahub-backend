Elbette, şimdi senin backend mimarine birebir uyumlu olacak şekilde **frontend için mimari dokümantasyon** hazırlıyorum. Bu doküman, hem developer onboarding'i hem de modül geliştirme süreçleri için kullanılabilir. İşte detaylı ve özelleştirilmiş halidir:

---

# 🧠 Ensotek Frontend Mimarisi – Geliştirici Talimatları

## 🎯 Proje Hedefi

Ensotek frontend, **Next.js (App Router)** mimarisiyle inşa edilen, çok dilli ve tema destekli kullanıcı arayüzüne sahip, modüler bir sistemdir. Admin paneli, ziyaretçi sayfaları ve kullanıcı panelleri ayrı dizinlerde yapılandırılmıştır.  
Veri yönetimi Redux Toolkit ile yapılır, UI bileşenleri styled-components ile stilize edilmiştir.

---

## 🛠 Teknoloji Yığını

| Katman       | Teknoloji                  |
|--------------|----------------------------|
| Framework    | Next.js (App Router)       |
| Dil          | TypeScript                 |
| Stil         | styled-components          |
| i18n         | react-i18next              |
| State        | Redux Toolkit              |
| Validasyon   | react-hook-form + yup      |
| API          | axios + apiCall yapısı     |
| UI           | Custom component library   |

---

## 📂 Dosya Yapısı (Frontend)

```
src/
├── app/                         # App Router sayfa dizini
│   ├── admin/                   # Admin panel sayfaları
│   ├── account/                 # Kullanıcı profil / ayarlar
│   ├── visitor/                 # Ziyaretçilere açık sayfalar
│   └── login / register / ...   # Genel auth işlemleri
├── components/                  # Reusable bileşenler
│   ├── shared/                  # Navbar, Footer, LanguageSwitcher vs.
│   ├── forms/                   # Form bileşenleri
│   └── [modül]/                 # Modül bileşenleri (ProductCard, NewsItem vs.)
├── redux/                       # RTK store + slice yapısı
│   ├── store.ts                 # Store yapılandırması
│   ├── hooks.ts                 # useAppDispatch / useAppSelector
│   └── slices/                  # authSlice, productSlice vs.
├── hooks/                       # Özel hook’lar
├── utils/                       # apiCall, formatter, slugify, cookie helpers
├── locales/                     # Çeviri dosyaları (tr.json, en.json, de.json)
├── styles/                      # Global styled-theme
└── i18n.ts                      # i18next config dosyası
```

---

## 🌍 Çok Dilli Sistem (i18n)

- `react-i18next` ve `i18next-browser-languagedetector` kullanılır.
- Dil dosyaları `src/locales/{lang}.json` içinde tutulur.
- Çeviri anahtarları modül bazlı gruplandırılır:
  ```json
  {
    "product": {
      "title": "Ürünler",
      "filters": "Filtreler"
    },
    "common": {
      "save": "Kaydet",
      "cancel": "İptal"
    }
  }
  ```
- Navbar’da dil değiştirici bulunur (LanguageSwitcher).
- Sunucu tarafı dil algılama: `cookies.get("i18next")` ile yapılır.
- Backend'e gönderilen isteklerde `Accept-Language` header'ı atanabilir.

---

## 🔐 Kimlik Doğrulama

- Giriş/çıkış işlemleri `authSlice` ile yönetilir.
- Token HTTP-only cookie olarak backend'de saklanır.
- `api.ts` içinde axios instance `withCredentials: true` ayarına sahiptir.
- Kullanıcı durumu `accountSlice` ile global state’te tutulur.
- Korunan sayfalar için `ProtectedRoute` bileşeni kullanılabilir.

---

## 🎨 Tema ve UI Tasarımı

- styled-components ile global `theme.ts` kullanılır.
- Dark/Light toggle desteklenir:
  ```ts
  export const lightTheme = { background: "#fff", text: "#000", ... };
  export const darkTheme = { background: "#111", text: "#fff", ... };
  ```
- Tüm UI bileşenleri `shared/` veya `components/{modül}` içinde yer alır.
- Global stiller `global.ts` dosyasında tanımlıdır.

---

## ⚙️ API ve RTK Yapısı

### 📌 apiCall Yardımcısı
```ts
export const apiCall = async (config: AxiosRequestConfig) => {
  const res = await axios(config);
  return res.data;
};
```

### 🧩 Slice Yapısı
```ts
// redux/slices/productSlice.ts
export const fetchProducts = createAsyncThunk(...);
const productSlice = createSlice({
  name: "products",
  initialState: { list: [], loading: false, error: null },
  reducers: { clearProductMessages },
  extraReducers: (builder) => { ... }
});
```

---

## 📊 Admin Panel Özellikleri

- Dashboard istatistikleri
- Ürün yönetimi (add/edit/delete + image upload)
- Sipariş yönetimi
- İçerik yönetimi (news, blog, article)
- Kullanıcı yönetimi
- Yorumlar, geri bildirimler
- Galeri ve medya yönetimi
- E-posta gelen kutusu + gönderim
- Chatbot yönetimi (AI destekli)

---

## 🤖 Yapay Zekâ Entegrasyonları

- Chat modülü: OpenAI GPT-3.5 ile entegre.
- Admin panelde chat geçmişi izlenebilir.
- SSS (FAQ) modülü GPT ile otomatik cevaplama yapabilir.
- Daha sonra ürün önerileri veya destek bileşenlerinde genişletilebilir.

---

## 🔁 Ortak Prensipler

- **Modülerlik**: Her modül ayrı component + slice yapısında
- **Tutarlılık**: Slice isimleri backend endpointlerine karşılık gelir
- **Dil Desteği**: Her metin i18n üzerinden gelir
- **Tema Uyumu**: Bütün stiller global tema üzerinden alınır
- **Reusability**: Form, Modal, Card gibi component’ler merkezi ve tekrar kullanılabilir

---

## 🧪 Test & CI/CD

| Araç              | Kullanım                |
|-------------------|--------------------------|
| Jest + RTL        | (Opsiyonel) birim testler |
| GitHub Actions    | Build ve deploy süreçleri |
| Vercel / Netlify  | (İsteğe bağlı) frontend host |
| Storybook         | Component UI preview     |

---

## 📍 Yol Haritası (Frontend)

| Adım | Modül / Özellik            | Durum         |
|------|-----------------------------|---------------|
| 1    | Auth işlemleri              | ✅ Tamamlandı |
| 2    | Admin panel & dashboard     | ✅ Tamamlandı |
| 3    | Ürün & kategori sayfaları   | ✅ Tamamlandı |
| 4    | Blog / Haber / Article      | ✅ Tamamlandı |
| 5    | Chatbot + AI destek         | ✅ Tamamlandı |
| 6    | Kullanıcı paneli (profil)   | ✅ Tamamlandı |
| 7    | Formlar (iletisim, feedback)| ✅ Tamamlandı |
| 8    | Galeri, kütüphane, e-posta  | ✅ Tamamlandı |
| 9    | Forum + Guestbook modülü    | 🔜 Planlanıyor |

---

