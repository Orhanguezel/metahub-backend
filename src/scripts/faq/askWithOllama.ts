import axios from "axios";
import { SupportedLocale } from "@/types/common";
import { t as translate } from "@/core/utils/i18n/translate";
import faqTranslations from "@/modules/faq/i18n";

/**
 * Interface
 */
interface AskWithOllamaOptions {
  question: string;
  context: string;
  lang: SupportedLocale;
  model?: string;
}

const OLLAMA_HOST = process.env.OLLAMA_HOST;

/**
 * Sends i18n prompt to Ollama and returns AI-generated answer
 */
export const askWithOllama = async ({
  question,
  context,
  lang,
  model = "llama3",
}: AskWithOllamaOptions): Promise<string> => {
  try {
    const promptTemplate = translate("faqs.llm_prompt", lang, faqTranslations);
    const prompt = promptTemplate
      .replace("{{question}}", sanitize(question))
      .replace("{{context}}", context || "No related FAQ content available.");

    const response = await axios.post(
      `${OLLAMA_HOST}/api/generate`,
      { model, prompt, stream: false },
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data?.response?.trim() || "No response from AI.";
  } catch (error: any) {
    console.error("❌ Ollama API Error:", error.response?.data || error.message);
    throw new Error("Ollama API failed to respond.");
  }
};

function sanitize(text: string): string {
  return text.replace(/[\n\r]/g, " ").trim();
}
