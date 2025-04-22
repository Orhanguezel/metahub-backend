import axios from "axios";

interface AskWithOllamaOptions {
  question: string;
  context?: string;
  model?: string;
  lang?: "tr" | "en" | "de";
}

const langText = {
  tr: {
    question: "Soru",
    context: "İlgili Bilgiler",
    answer: "Cevap",
  },
  en: {
    question: "Question",
    context: "Related Information",
    answer: "Answer",
  },
  de: {
    question: "Frage",
    context: "Verwandte Informationen",
    answer: "Antwort",
  },
};

export const askWithOllama = async ({
  question,
  context = "",
  model = "tinyllama",
  lang = "en",
}: AskWithOllamaOptions): Promise<string> => {
  if (!question?.trim()) return "❗ Soru girilmedi.";

  const l = langText[lang] || langText.en;

  const prompt = `${l.question}: ${question}\n\n${l.context}:\n${context}\n\n${l.answer}:`;

  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model,
      prompt,
      stream: false,
    });

    const result = response?.data?.response?.trim();
    return result || "❌ Cevap alınamadı.";
  } catch (error: any) {
    console.error("❌ Ollama API Hatası:", error.message);
    return "❌ Cevap üretme sırasında bir hata oluştu.";
  }
};
