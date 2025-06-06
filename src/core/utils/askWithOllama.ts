// src/core/ai/askWithOllama.ts

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

const OLLAMA_HOST = process.env.OLLAMA_HOST;

if (!OLLAMA_HOST) {
  throw new Error("❌ OLLAMA_HOST is not defined in environment.");
}

export const askWithOllama = async ({
  question,
  context = "",
  model = "tinyllama",
  lang = "en",
}: AskWithOllamaOptions): Promise<string> => {
  if (!question?.trim()) return "❗ Question is missing.";

  const l = langText[lang] || langText.en;

  const prompt = `${l.question}: ${question}\n\n${l.context}:\n${context}\n\n${l.answer}:`;

  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model,
      prompt,
      stream: false,
    });

    const result = response?.data?.response?.trim();
    return result || "❌ No response received.";
  } catch (error: any) {
    console.error("❌ Ollama API error:", error.message);
    return "❌ An error occurred while generating a response.";
  }
};
