Harika, şimdi **`MODULE_GUIDE.md`** dokümanını hazırlayalım. Bu doküman, Metahub Backend mimarisinde bir modülün nasıl tanımlandığını, yapılandırıldığını ve yönetildiğini detaylı şekilde açıklar. İşte ilk versiyonu:

---

# 📦 Modül Geliştirme Rehberi – MetaHub Backend

Bu rehber, MetaHub projesinde yeni bir backend modülü oluşturmak ve yapılandırmak için izlenmesi gereken standartları açıklar.

---

## 🧱 Modül Nedir?

Modül; kendi:
- Model (Mongoose şeması),
- Controller (iş mantığı),
- Routes (Express endpoint'leri),
- Validation (Zod şemaları),
- Testler (Jest/supertest),
- Swagger meta bilgisi

ile birlikte gelen, sistemden bağımsız çalışabilen **izole bir backend birimidir**.

---

## 📂 Modül Dosya Yapısı

Her modül `src/modules/` altında bir klasörde bulunur:

```
src/modules/<modul-adi>/
├── <modul>.controller.ts       // İş mantığı
├── <modul>.models.ts           // Mongoose modeli
├── <modul>.routes.ts           // REST endpoint tanımları
├── <modul>.validation.ts       // Zod ile veri doğrulama
├── index.ts                    // Dışa aktarım
└── __tests__/
    └── <modul>.controller.spec.ts // Jest testleri
```

---

## 📎 index.ts Kullanımı

Tüm modül dışa aktarımları `index.ts` üzerinden yapılır:

```ts
import express from "express";
import routes from "./<modul>.routes";

const router = express.Router();
router.use("/", routes);

export * from "./<modul>.controller";
export { default as <ModulModel> } from "./<modul>.models";
export default router;
```

---

## ⚙️ Modül Otomasyonu

Yeni bir modül oluşturmak için CLI komutu kullanılabilir:

```bash
bun run scripts/createModule.ts <modul-adi>
```

Bu komut:
- Dosya yapısını otomatik oluşturur
- Test dosyası ekler
- Meta dosyasını `meta-configs/metahub/` altına yazar

---

## 🛡️ Validasyon

Her modül, `zod` kullanarak kendi `validation.ts` dosyasında veri doğrulamasını yapar. Bu sayede hem Swagger hem runtime doğrulama senkronize çalışır.

```ts
export const BlogCreateSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});
```

---

## 📃 Meta Bilgisi (Swagger Entegrasyonu)

Her modül için bir `meta.json` dosyası oluşturulur:

```
meta-configs/metahub/<modul>.meta.json
```

Bu dosya:
- Swagger endpoint'lerini oluşturur
- Admin panel görünürlüğünü belirler
- Modül durumunu (`enabled`, `visibleInSidebar`) tanımlar

> Bu dosya otomatik veya manuel yazılabilir.

---

## 🔧 Ortam Dosyaları ve Modül Aktivasyonu

Modüllerin aktif/pasif olma durumu `.env.*` dosyalarındaki `ENABLED_MODULES` alanı ile belirlenir:

```env
ENABLED_MODULES=blog,product,faq,order
```

---

## 🧪 Testler

Her modül için Jest ile yazılmış bir test iskeleti oluşturulur:

```ts
describe("Product module", () => {
  it("should create a product", async () => {});
  it("should get all products", async () => {});
});
```

Test dosyaları: `__tests__/<modul>.controller.spec.ts`

---

## 🧬 Gelişime Açık Noktalar

- [ ] Modül içi **permissions** alanı (`canCreate`, `canUpdate` gibi)
- [ ] Modül için `formSchema` → Admin UI otomasyonu
- [ ] `index.ts` üzerinden tip dışa aktarımları (model interface vs)
- [ ] Swagger için örnek response verileri
- [ ] Ortak `base.controller.ts` kullanımı önerilebilir (DRY)

---

Sıradaki dokümana geçebiliriz:  
`MULTILINGUAL.md`, `SWAGGER_SETUP.md` veya `DEPLOYMENT.md` — hangisini seçmek istersin?