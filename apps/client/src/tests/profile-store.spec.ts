import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useProfileStore } from "../stores/profile";
import { useSessionStore } from "../stores/session";
import { clientApi } from "../services/api";

vi.mock("../services/api", () => ({
  clientApi: {
    getBasicProfile: vi.fn(),
    getCampusProfile: vi.fn(),
    getScheduleProfile: vi.fn(),
    saveBasicProfile: vi.fn(),
    saveCampusProfile: vi.fn(),
    saveScheduleProfile: vi.fn(),
    getLoginHero: vi.fn(),
    getSession: vi.fn(),
    loginWithWechat: vi.fn(),
  },
}));

describe("profile store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("refreshes session completion state after each setup save", async () => {
    const sessionStore = useSessionStore();
    sessionStore.userSession = {
      userId: "user-1",
      loggedIn: true,
      loginMethod: "wechat",
      displayName: "星野",
      phoneBound: false,
      profileCompleted: false,
      campusVerified: false,
      scheduleCompleted: false,
      campusName: null,
      featureFlags: {
        chat_ai_enabled: false,
      },
    };

    vi.mocked(clientApi.saveBasicProfile).mockResolvedValue({
      nickname: "若星",
      bio: "个人简介",
      grade: "大三",
      pronouns: "她/她",
    });
    vi.mocked(clientApi.saveCampusProfile).mockResolvedValue({
      city: "广州",
      campusName: "北校区",
      department: "设计系",
      verificationStatus: "pending",
    });
    vi.mocked(clientApi.saveScheduleProfile).mockResolvedValue({
      preferredCampusArea: "图书馆",
      preferredTimeWindows: ["今晚"],
      courseBlocks: [],
    });
    vi.mocked(clientApi.getSession)
      .mockResolvedValueOnce({
        ...sessionStore.userSession,
        displayName: "若星",
        profileCompleted: true,
      })
      .mockResolvedValueOnce({
        ...sessionStore.userSession,
        displayName: "若星",
        profileCompleted: true,
        campusVerified: true,
        campusName: "北校区",
      })
      .mockResolvedValueOnce({
        ...sessionStore.userSession,
        displayName: "若星",
        profileCompleted: true,
        campusVerified: true,
        scheduleCompleted: true,
        campusName: "北校区",
      });

    const profileStore = useProfileStore();

    await profileStore.saveBasicProfile({
      nickname: "若星",
      bio: "个人简介",
      grade: "大三",
      pronouns: "她/她",
    });
    expect(sessionStore.userSession?.profileCompleted).toBe(true);
    expect(sessionStore.userSession?.displayName).toBe("若星");

    await profileStore.saveCampusProfile({
      city: "广州",
      campusName: "北校区",
      department: "设计系",
    });
    expect(sessionStore.userSession?.campusVerified).toBe(true);
    expect(sessionStore.userSession?.campusName).toBe("北校区");

    await profileStore.saveScheduleProfile({
      preferredCampusArea: "图书馆",
      preferredTimeWindows: ["今晚"],
      courseBlocks: [],
    });
    expect(sessionStore.userSession?.scheduleCompleted).toBe(true);
  });
});
