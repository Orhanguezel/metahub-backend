import axios from "axios";

const languagePrompts: Record<"tr" | "en" | "de", string> = {
  tr: `Kullanıcının sorusu: {{question}}

Aşağıda bazı örnek SSS içerikleri verilmiştir.
Lütfen bu bilgileri kullanarak kullanıcıya kısa, sade ve anlaşılır bir yanıt ver:

{{context}}`,

  en: `User question: {{question}}

Below are some related FAQ entries.
Please use this information to give a short, clear and helpful response:

{{context}}`,

  de: `Benutzerfrage: {{question}}

Unten findest du einige verwandte FAQ-Einträge.
Bitte verwende diese Informationen, um eine kurze, klare und hilfreiche Antwort zu geben:

{{context}}`,
};

interface AskWithOllamaOptions {
  question: string;
  context: string;
  lang: "tr" | "en" | "de";
  model?: string;
}

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

/**
 * Sends multilingual prompt to Ollama and gets response.
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
      .replace("{{context}}", context || "No related data found.");

    const response = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      { model, prompt, stream: false },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    return response.data?.response?.trim() || "No response from AI.";
  } catch (error: any) {
    console.error("❌ Ollama API Error:", error.response?.data || error.message);
    throw new Error("Ollama'dan yanıt alınamadı.");
  }
};

function sanitize(text: string): string {
  return text.replace(/[\n\r]/g, " ").trim();
}
