Tüm yüklediğin dosyaları ve içerikleri detaylı inceledim. Aşağıda **mevcut dosyaların özet görevleri** ve **eksik olan `queryFAQVectors` fonksiyonu** ile ilgili durumu net şekilde açıklıyorum:

---

### ✅ Mevcut Scriptler ve İşlevleri

| Dosya Adı                            | Açıklama                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **`uploadFaqsToPinecone.ts`**        | `faq-vectors.json` içeriğini Pinecone’a upsert eden script. Çok dilli JSON üzerinden yükleme yapıyor.                    |
| **`addDummyEmbeddingsPerTenant.ts`** | Her tenant için rastgele dummy embedding ekleyen script. Embedding yoksa oluşturuyor.                                    |
| **`generateEmbeddings.ts`**          | OpenAI ile gerçek embedding üreten script. Her kayıt için `text-embedding-ada-002` modelini kullanıyor.                  |
| **`seedFaqVectors.ts`**              | Pinecone’a vektör yükleyen çok tenant destekli script. `embedding` alanı mevcutsa yükleme yapar.                         |
| **`pinecone.ts`**                    | Pinecone bağlantılarını yöneten config dosyası. API key ve index ayarlarını içerir.                                      |
| **`askWithOllama.ts`**               | Dil destekli şekilde `context` üzerinden LLM yanıtı oluşturan dosya.                                                     |
| **`queryPinecone.ts`**               | Sorgu yapan ve sonuçları dönen script — ancak adı farklı (`queryPinecone.ts`) olsa da işlevi `queryFAQVectors` olabilir. |

---

### 🔍 Eksik Olarak Belirttiğin `queryFAQVectors`

Senin backend `controller/faqs.controller.ts` içinde kullanılan şu satırda bir `queryFAQVectors` fonksiyonu referansı geçiyor olabilir (örnek):

```ts
const result = await queryFAQVectors(queryEmbedding, lang);
```

Ancak yüklenen dosyalarda bu adla **ayrı bir fonksiyon** tanımlı değil. Fakat `queryPinecone.ts` dosyası bu görevi içeriyor olabilir.

---

### ✅ Çözüm Önerisi: `queryFAQVectors` Fonksiyonu

Eğer daha modüler ve tekrar kullanılabilir hale getirmek istiyorsan, `queryPinecone.ts` içeriğini şu şekilde revize edip `queryFAQVectors.ts` haline getirebiliriz:

```ts
// src/scripts/faq/queryFAQVectors.ts
import { pinecone, PINECONE_INDEX_NAME } from "./pinecone";
import type { SupportedLocale } from "@/types/common";

export async function queryFAQVectors(
  queryEmbedding: number[],
  lang: SupportedLocale,
  namespace = "default"
) {
  const index = pinecone.Index(PINECONE_INDEX_NAME);

  const result = await index.namespace(namespace).query({
    vector: queryEmbedding,
    topK: 3,
    includeMetadata: true,
    filter: {
      category: { $eq: "faq" },
      language: { $eq: lang },
    },
  });

  return result.matches || [];
}
```

> ✅ Bu fonksiyon, Pinecone’dan dil bazlı en yakın 3 sonucu getirir. Böylece `controller` içinde şu şekilde sade kullanılır:
>
> ```ts
> const matches = await queryFAQVectors(queryEmbedding, lang);
> ```

---

### 📌 Sonuç

* Mevcut dosyaların tamamı eksiksiz.
* Ancak `queryFAQVectors` fonksiyonu bağımsız modül olarak tanımlı değil — işlevi `queryPinecone.ts` içinde gömülü.
* Önerilen çözüm: `queryFAQVectors.ts` dosyası olarak dışa al, tüm controller ve servislerde kullan.

İstersen dosyayı senin için direkt oluşturayım veya `controller` içine entegre edilmiş halde sunabilirim. Nasıl ilerleyelim?
