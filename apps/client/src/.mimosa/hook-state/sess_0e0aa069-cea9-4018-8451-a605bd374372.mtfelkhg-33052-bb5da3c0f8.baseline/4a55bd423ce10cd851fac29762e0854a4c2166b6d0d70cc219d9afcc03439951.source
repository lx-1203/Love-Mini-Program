import type { UserProfileDTO } from "../types/profile";

export function buildProfileShareTitle(profile: UserProfileDTO | null): string {
  if (!profile) return "寻觅主页";
  return `${profile.basic.name} 的寻觅主页`;
}

export function useProfileShare(profile: UserProfileDTO | null) {
  return {
    shareTitle: buildProfileShareTitle(profile),
  };
}
