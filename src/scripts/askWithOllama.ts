import axios from "axios";

/**
 * Ollama'ya prompt gönderip cevap döner
 * @param prompt Kullanıcının sorusu + context
 * @param context (Opsiyonel) Pinecone’dan gelen bağlamsal veri
 * @returns AI cevabı (string)
 */
export const askWithOllama = async (
  prompt: string,
  context?: string
): Promise<string> => {
  try {
    const fullPrompt = context
      ? `${prompt}\n\nContext:\n${context}`
      : prompt;

    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "llama3", // veya "mistral" ya da hangi modeli kullanıyorsan
        prompt: fullPrompt,
        stream: false,
      }
    );

    return response.data.response?.trim() || "No response from model.";
  } catch (error: any) {
    console.error("❌ Ollama API Hatası:", error.message);
    throw new Error("Ollama'dan cevap alınamadı.");
  }
};
