import type { UserProfileDTO } from "../types/profile";

export function useProfileLoader() {
  let profile: UserProfileDTO | null = null;
  let loading = false;
  let errorMessage = "";

  async function load(fetcher: () => Promise<UserProfileDTO>): Promise<UserProfileDTO | null> {
    loading = true;
    errorMessage = "";
    try {
      profile = await fetcher();
      return profile;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "加载失败";
      return null;
    } finally {
      loading = false;
    }
  }

  return {
    profile,
    loading,
    errorMessage,
    load,
  };
}
