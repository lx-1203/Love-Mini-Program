import type { components } from "../services/generated/api-types";
import { resolveLoginHero } from "../features/login/hero";

type Schemas = components["schemas"];

export function toLoginHeroView(hero: Schemas["LoginHeroConfig"]) {
  return resolveLoginHero(hero);
}
