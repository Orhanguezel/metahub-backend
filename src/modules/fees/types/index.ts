export type FeeMode = "fixed" | "percent";
export type ApplyCondition = "cod" | "below_free_shipping" | "express_shipping" | "all";

export interface FeeRuleInput {
  code: string;                            // "cod", "packaging"
  name: Record<string, string>;            // i18n
  isActive?: boolean;
  currency: string;                        // "TRY","EUR" (upper)
  mode: FeeMode;
  amount?: number;                         // cents (if mode=fixed)
  percent?: number;                        // 0..1 (if mode=percent)
  min_cents?: number;                      // optional floor
  max_cents?: number;                      // optional cap
  appliesWhen?: ApplyCondition[];
}

export interface FeeRuleUpdateInput extends Partial<FeeRuleInput> {}

export interface FeeListQuery {
  q?: string;
  lang?: string;                           // default "tr"
  isActive?: boolean;
  currency?: string;
  mode?: FeeMode;
  when?: ApplyCondition | ApplyCondition[];// filter by appliesWhen
  limit?: number;                          // default 200
  sort?: "code_asc" | "code_desc" | "created_desc" | "created_asc";
}
