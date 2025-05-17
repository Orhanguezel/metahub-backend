import axios from "axios";

// 🌍 Çok dilli prompt şablonları
const languagePrompts: Record<"tr" | "en" | "de", string> = {
  tr: `
Kullanıcının sorusu: {{question}}

Aşağıda bazı örnek SSS içerikleri verilmiştir.
Lütfen bu bilgileri kullanarak kullanıcıya kısa, sade ve anlaşılır bir yanıt ver:

{{context}}
  `,
  en: `
User question: {{question}}

Below are some related FAQ entries.
Please use this information to give a short, clear and helpful response:

{{context}}
  `,
  de: `
Benutzerfrage: {{question}}

Unten findest du einige verwandte FAQ-Einträge.
Bitte verwende diese Informationen, um eine kurze, klare und hilfreiche Antwort zu geben:

{{context}}
  `,
};

interface AskWithOllamaOptions {
  question: string;
  context: string;
  lang: "tr" | "en" | "de";
  model?: string; // opsiyonel model seçimi (varsayılan llama3)
}

/**
 * Ollama'ya çok dilli prompt gönderip cevap alır
 */
export const askWithOllama = async ({
  question,
  context,
  lang,
  model = "llama3",
}: AskWithOllamaOptions): Promise<string> => {
  try {
    const template = languagePrompts[lang] || languagePrompts.en;

    const prompt = template
      .replace("{{question}}", sanitize(question))
      .replace("{{context}}", context || "Yetersiz veri bulundu.");

    const response = await axios.post("http://localhost:11434/api/generate", {
      model,
      prompt,
      stream: false,
    });

    return response.data?.response?.trim() || "AI'den yanıt alınamadı.";
  } catch (error: any) {
    console.error("❌ Ollama API Hatası:", error.message);
    throw new Error("Ollama'dan yanıt alınamadı.");
  }
};

// 🛡️ Basit prompt injection koruması
function sanitize(text: string): string {
  return text.replace(/[\n\r]/g, " ").trim();
}
