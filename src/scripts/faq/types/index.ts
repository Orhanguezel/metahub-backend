// src/scripts/faq/types/index.ts
export interface FAQVectorMatch {
  id: string;
  score: number;
  metadata: Record<string, any>; // İçinde question_tr, answer_de vb.
}