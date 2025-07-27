// src/scripts/faq/rerankFAQMatches.ts
import stringSimilarity from "string-similarity";
import type { SupportedLocale } from "@/types/common";
import type { FAQVectorMatch } from "@/scripts/faq/types";

export interface RerankedItem {
  id: string;
  question: string;
  answer: string;
  combinedScore: number;
}

/**
 * Reranks Pinecone matches using both vector similarity and string similarity.
 */
export function rerankFAQMatches(
  matches: FAQVectorMatch[],
  query: string,
  lang: SupportedLocale
): RerankedItem[] {
  return matches
    .map((match) => {
      const q = match.metadata?.[`question_${lang}`] || "";
      const a = match.metadata?.[`answer_${lang}`] || "";
      const stringSim = stringSimilarity.compareTwoStrings(query, q);
      const combinedScore = match.score * 0.7 + stringSim * 0.3;

      return {
        id: match.id,
        question: q,
        answer: a,
        combinedScore,
      };
    })
    .sort((a, b) => b.combinedScore - a.combinedScore);
}
