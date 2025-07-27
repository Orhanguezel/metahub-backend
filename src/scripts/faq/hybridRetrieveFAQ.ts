import stringSimilarity from "string-similarity";
import type { SupportedLocale } from "@/types/common";
import { queryFAQVectors } from "./queryFAQVectors";
import { generateEmbeddingFromOpenAI } from "./generateEmbeddingFromOpenAI";
import type { FAQVectorMatch } from "./types";

export interface HybridFAQMatch {
  id: string;
  question: string;
  answer: string;
  score: number; // Combined hybrid score
}

/**
 * Retrieves and reranks FAQ matches using hybrid scoring:
 * - vector similarity
 * - string similarity
 * - token overlap
 */
export async function hybridRetrieveFAQ(
  query: string,
  lang: SupportedLocale,
  tenant: string,
  topK = 3
): Promise<HybridFAQMatch[]> {
  const embedding = await generateEmbeddingFromOpenAI(query);

  const rawMatches: FAQVectorMatch[] = await queryFAQVectors({
    tenant,
    language: lang,
    vector: embedding,
    topK: 15,
  });

  const reranked = rawMatches.map((match) => {
    const questionText = match.metadata?.[`question_${lang}`] ?? "";
    const answerText = match.metadata?.[`answer_${lang}`] ?? "";

    const vectorSim = match.score ?? 0;
    const stringSim = stringSimilarity.compareTwoStrings(query, questionText);
    const tokenOverlap = computeTokenOverlap(query, questionText);

    const score = vectorSim * 0.6 + stringSim * 0.3 + tokenOverlap * 0.1;

    return {
      id: match.id,
      question: questionText,
      answer: answerText,
      score,
    };
  });

  return reranked.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Computes word token overlap ratio between two strings
 */
function computeTokenOverlap(a: string, b: string): number {
  const tokensA = a.toLowerCase().split(/\s+/);
  const tokensB = b.toLowerCase().split(/\s+/);
  const overlap = tokensA.filter((token) => tokensB.includes(token)).length;
  return overlap / Math.max(tokensA.length, 1);
}
