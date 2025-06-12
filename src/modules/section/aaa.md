Mükemmel, **“section” modülü** ile başlıyoruz ve sonra çok dilliliğe genişleteceğiz. Sana sıfırdan, adım adım öneriyorum:

---

### 1. **İlk Modül Oluşturma (Tek Dil)**

#### **Formda Doldurulacaklar:**

* **Modül İsmi:** `section`
* **İkon:** (Materyal ikon formatında önerilir)

  * Öneri: `MdViewModule` (bölüm/anasection çağrışımlı)
* **Roller:** `admin`
* **Dil:** Türkçe
* **Sıralama:** 0
* **Sidebar'da Göster:** ✔️
* **Analytics Aktif:** (Tercihine göre)
* **Aktif:** ✔️
* **Dashboard'da Göster:** ✔️

---

### 2. **6 Dil İçin Label’ları Girmen Gereken Değerler**

| Dil      | Label     |
| -------- | --------- |
| Türkçe   | Bölümler  |
| English  | Sections  |
| Deutsch  | Bereiche  |
| Polski   | Sekcje    |
| Français | Sections  |
| Español  | Secciones |

**İkon için:**

* `MdViewModule` veya `MdWidgets` veya (daha sade istersen) `MdSpaceDashboard` gibi seçeneklerden biri ideal.

---

### 3. **Adım Adım İşlem Sırası:**

1. **Tek dilde (`Türkçe`) oluştur**:

   * Modül İsmi: `section`
   * İkon: `MdViewModule`
   * Label: `Bölümler`

2. **Oluşturduktan sonra “düzenle” ile 6 dili doldur**:

   * Türkçe: **Bölümler**
   * English: **Sections**
   * Deutsch: **Bereiche**
   * Polski: **Sekcje**
   * Français: **Sections**
   * Español: **Secciones**

3. **Kaydet** — artık modül çok dilli!

---

### 4. **Ekstra Bilgi**

* “section” modülü senin dynamic homepage yapılarını konfigüre etmek için merkezi yerin olacak.
* Dilersen “description” alanı da ekleyebilirsin:

  * “Ana sayfa için dinamik bölüm yönetimi.”
  * 6 dilde karşılığına da çevirebilirim.

---

### 5. **Kopyala-Yapıştır için Hazır Label’lar**

```json
{
  "tr": "Bölümler",
  "en": "Sections",
  "de": "Bereiche",
  "pl": "Sekcje",
  "fr": "Sections",
  "es": "Secciones"
}
```

**İkon:**
`MdViewModule`

---

Yardıma devam edelim mi?

* **Section modülü ile ilgili özel açıklama veya ayar eklemek ister misin?**
* Sonra “tenant home section settings” modelini mi ilerletelim?
  İstediğin adımda devam edebiliriz!
