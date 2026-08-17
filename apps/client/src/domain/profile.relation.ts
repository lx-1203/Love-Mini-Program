export interface ProfileRelation {
  liked: boolean;
  matched: boolean;
  chatted: boolean;
  blocked: boolean;
  matchScore: number;
  matchReasons: string[];
}

export type ProfileRelationCta =
  | "stranger"
  | "liked"
  | "matched"
  | "chatted"
  | "blocked";
