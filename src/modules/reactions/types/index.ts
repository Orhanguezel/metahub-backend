import type { Types, Document } from "mongoose";

/** Kullanılabilir tepki türleri */
export type ReactionKind = "LIKE" | "FAVORITE" | "BOOKMARK" | "EMOJI" | "RATING";

/** Polimorfik hedef tipi (free-form string, index'li) */
export type ReactionTargetType =
  | "menuitem"
  | "product"
  | "about"
  | "post"
  | "comment"
  | "category"
  | string;

export interface IReaction extends Document {
  tenant: string;
  user: Types.ObjectId;

  kind: ReactionKind;
  /** kind === "EMOJI" ise zorunlu; diğer türlerde boş bırakın */
  emoji?: string | null;

  /** kind === "RATING" ise 1..5 arası zorunlu; diğerlerinde null */
  value?: number | null;

  targetType: ReactionTargetType;
  targetId: Types.ObjectId;

  /** gevşek metadata (kaynak, cihaz, ip vb. için) */
  extra?: Record<string, unknown>;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
