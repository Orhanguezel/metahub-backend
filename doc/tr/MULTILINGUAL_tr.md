Harika, şimdi çok dilli yapı dokümantasyonunu oluşturalım. İşte **`MULTILINGUAL.md`** dosyasının ilk versiyonu:

---

# 🌐 Çok Dilli İçerik Mimari Rehberi (Multilingual Guide)

Bu belge, MetaHub backend mimarisinde **çok dilli (i18n)** verilerin nasıl yönetileceğini ve hangi durumlarda hangi stratejinin kullanılacağını açıklar.

---

## 🎯 Amaç

- Uluslararasılaştırmaya hazır bir backend yapısı kurmak
- Modül bazlı çok dilli içerik üretimini kolaylaştırmak
- Kullanıcı arayüz dili ve veri dili ayrımını netleştirmek

---

## ✅ İki Temel Kavram

| Alan                        | Tanım                                                    |
|----------------------------|-----------------------------------------------------------|
| `language` field           | Kullanıcının arayüz dili tercihi                          |
| Çok dilli veri yapısı      | İçerik alanlarının (örnek: `title`, `description`) tüm dillerde tutulması |

---

## 📂 Model Tiplerine Göre Strateji

| Model Türü                  | `language` alanı  | Çok Dilli Alanlar |
|----------------------------|-------------------|--------------------|
| 🧍 Kullanıcı/Sistem modelleri (`User`, `Settings`) | ✅ Evet | ❌ Hayır |
| 📝 İçerik/Tanıtım modelleri (`Blog`, `FAQ`, `Service`) | ❌ Hayır | ✅ Evet |

---

## 🧍 Sistemsel Modeller

- Kullanıcının arayüz tercihini saklar.
- Örnek:
```ts
user.language = "de";
```
- Ancak `name`, `bio`, `notification.message` gibi alanlar **tek dil** içeriklidir.

---

## 📝 İçerik Modelleri

Bu modellerde çok dilli alanlar şu şekilde tanımlanır:

```ts
label: {
  tr: string;
  en: string;
  de: string;
},
description: {
  tr: string;
  en: string;
  de: string;
}
```

> 🔁 Slug alanı tekil tutulur: `slug: string`

---

## 📘 Örnek: Blog Şeması

```ts
const blogSchema = new Schema({
  label: {
    tr: { type: String, required: true },
    en: { type: String, required: true },
    de: { type: String, required: true },
  },
  content: {
    tr: String,
    en: String,
    de: String,
  },
  slug: { type: String, unique: true },
});
```

---

## 🛠️ İçerik Girişi

- Admin panelde tek form ile tüm diller girilir.
- `label.tr`, `label.en`, `label.de` alanları aynı formda bulunur.
- Dil bazlı tekrar eden kayıtlar oluşturulmaz!

---

## ⚠️ Dikkat Edilmesi Gerekenler

- Her çok dilli alan, `tr`, `en`, `de` içermelidir (zorunluysa).
- **Tekil belge – çok dilli alanlar** yapısı kullanılmalıdır.
- `language` alanı sadece kullanıcı bağlamında anlamlıdır, veri bağlamında değil.
- E-posta bildirimleri, feedback mesajları, sistem logları gibi alanlar genelde tek dilde tutulur.

---

## 📌 Gelişime Açık Noktalar

- [ ] Admin panelde dil bazlı içerik filtreleme
- [ ] Giriş yapılan dile göre varsayılan alanın otomatik doldurulması
- [ ] Boş dil alanları için uyarı ve validasyon sistemleri
- [ ] Otomatik çeviri (AI destekli) desteklenmesi (opsiyonel)

---

Sırada hangisini belgeleyelim?

- `SWAGGER_SETUP.md`
- `DEPLOYMENT.md`
- `README.md`

Hazırsan devam edelim.