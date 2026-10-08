import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useProfileStore, mapBasicProfileToEditForm } from "../stores/profile";
import { useSessionStore } from "../stores/session";
import { clientApi } from "../services/api";
import { isCacheFresh, setCachedValue } from "../utils/cache-ttl";

vi.mock("../services/api", () => ({
  clientApi: {
    getBasicProfile: vi.fn(),
    getCampusProfile: vi.fn(),
    getScheduleProfile: vi.fn(),
    saveBasicProfile: vi.fn(),
    updateBasicProfile: vi.fn(),
    uploadProfilePhoto: vi.fn(),
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
      displayName: "林晓",
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

  // 收尾轮：mock 模式下头像 URL 由本地头像提供（修复我的页头像仅显示首字）
  it("mock 模式下 load() 提供本地头像 avatarUrl", async () => {
    const store = useProfileStore();
    await store.load();
    // 2026-09-17：D-05（第五轮 QA）本人头像素材更新为 avatars/avatar-1.jpg（原 person-01-avatar.png 下线），
    // 断言语义不变：mock load() 必须提供本地打包头像，而非空串/首字兜底。
    expect(store.avatarUrl).toContain("/static/assets/images/avatars/avatar-1.jpg");
  });
});

/**
 * MP-R7-EDITPAGE（2026-10-07）：编辑资料页（?entry=edit）回显与保存映射层。
 *
 * 背景（PFI15 审计线索）：编辑模式回显从未被帧级验证，且原页面直接读
 * load() 的四端点 Promise.all 结果——任一端点失败 basicProfile 为 null，
 * 编辑页整页空白。本轮把回显收敛为 store 映射层 mapBasicProfileToEditForm
 * （纯函数）+ loadBasicForEdit（单端点）/saveBasicUpdate（保存闭环）。
 */
describe("profile 编辑页回显与保存（MP-R7-EDITPAGE）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    (uni as unknown as { __mockStorage?: Map<string, unknown> }).__mockStorage?.clear();
  });

  /** GET /v1/profile/basic 的完整响应形态（对照后端 BasicProfileView 字段） */
  const fullBasic = {
    nickname: "林晓",
    bio: "热爱生活",
    grade: "大三",
    pronouns: "TA",
    height: 165,
    educationLevel: "bachelor",
    relationshipStatus: "never",
    hometownProvince: "广东",
    hometownCity: "广州",
    futureCity: "深圳",
    expectedPartner: "温柔 爱运动",
    avatarUrl: "https://cdn.example.com/avatar.jpg",
    photoGallery: ["https://cdn.example.com/p1.jpg", "https://cdn.example.com/p2.jpg"],
    verificationBadgeLevel: "school",
  } as unknown as Parameters<typeof mapBasicProfileToEditForm>[0];

  it("mapBasicProfileToEditForm：GET /v1/profile/basic 全字段映射，缺字段不丢回显", () => {
    const echo = mapBasicProfileToEditForm(fullBasic, { localIdentity: "student" });
    expect(echo.nickname).toBe("林晓");
    expect(echo.bio).toBe("热爱生活");
    expect(echo.grade).toBe("大三");
    expect(echo.pronouns).toBe("TA");
    expect(echo.height).toBe(165);
    expect(echo.educationLevel).toBe("bachelor");
    expect(echo.relationshipStatus).toBe("never");
    expect(echo.hometownProvince).toBe("广东");
    expect(echo.hometownCity).toBe("广州");
    expect(echo.futureCity).toBe("深圳");
    expect(echo.expectedPartner).toBe("温柔 爱运动");
    expect(echo.avatarUrl).toBe("https://cdn.example.com/avatar.jpg");
    expect(echo.photoGallery).toEqual([
      "https://cdn.example.com/p1.jpg",
      "https://cdn.example.com/p2.jpg",
    ]);
    // 服务端校园信号（verificationBadgeLevel=school）→ 身份回显为 student
    expect(echo.identity).toBe("student");
  });

  it("mapBasicProfileToEditForm：身份推导——服务端校园信号优先，否则回退本地身份", () => {
    // session.campusVerified=true 同样视为服务端校园信号，压过本地 non_student
    const viaSession = mapBasicProfileToEditForm(fullBasic, {
      localIdentity: "non_student",
      campusVerified: true,
    });
    expect(viaSession.identity).toBe("student");

    // 服务端无任何校园信号（verificationBadgeLevel=none）→ 回退本地持久化身份
    const fallback = mapBasicProfileToEditForm(
      { ...fullBasic, verificationBadgeLevel: "none" },
      { localIdentity: "non_student" },
    );
    expect(fallback.identity).toBe("non_student");
  });

  it("mapBasicProfileToEditForm：null 安全——basic 为 null 时回退空值且 photoGallery 为空数组", () => {
    const echo = mapBasicProfileToEditForm(null, { localIdentity: "non_student" });
    expect(echo.nickname).toBe("");
    expect(echo.bio).toBe("");
    expect(echo.height).toBeUndefined();
    expect(echo.educationLevel).toBeUndefined();
    expect(echo.relationshipStatus).toBeUndefined();
    expect(echo.hometownProvince).toBe("");
    expect(echo.futureCity).toBe("");
    expect(echo.expectedPartner).toBe("");
    expect(echo.avatarUrl).toBe("");
    expect(echo.photoGallery).toEqual([]);
    expect(echo.identity).toBe("non_student");
  });

  it("loadBasicForEdit：返回回显视图并同步 store（mock 分支复用 load() 演示数据，不清空照片墙）", async () => {
    const store = useProfileStore();
    const echo = await store.loadBasicForEdit();
    expect(echo.nickname).toBe(store.basicProfile?.nickname);
    // mock 演示照片墙（mockBasicProfile.photoGallery 4 张）不得被单端点取值清空
    expect(echo.photoGallery.length).toBe(4);
    expect(store.photoGallery.length).toBe(echo.photoGallery.length);
  });

  it("saveBasicUpdate：PUT 成功即保存成功——合并 basicProfile 视图并失效 60s TTL 缓存", async () => {
    const store = useProfileStore();
    await store.load();
    // 模拟我的页 load() 预热的 TTL 缓存：保存后必须失效，否则返回我的页看到旧资料
    setCachedValue("profile:load", true);
    expect(isCacheFresh("profile:load", 60_000)).toBe(true);

    vi.mocked(clientApi.updateBasicProfile).mockResolvedValue(undefined);
    await store.saveBasicUpdate({
      nickname: "新昵称",
      bio: "新简介",
      grade: "大四",
      pronouns: "TA",
      height: 170,
    });

    expect(clientApi.updateBasicProfile).toHaveBeenCalledTimes(1);
    expect(store.basicProfile?.nickname).toBe("新昵称");
    // 保存动作不得连带清空照片墙/头像（原页面直连 clientApi 的旧链路无任何本地同步）
    expect(store.photoGallery.length).toBe(4);
    expect(isCacheFresh("profile:load", 60_000)).toBe(false);
  });

  it("saveBasicUpdate：PUT 失败时向上抛出（页面据此外显「保存失败」）且不污染本地视图", async () => {
    const store = useProfileStore();
    await store.load();
    vi.mocked(clientApi.updateBasicProfile).mockRejectedValue(new Error("network down"));
    await expect(store.saveBasicUpdate({ nickname: "不该生效" })).rejects.toThrow("network down");
    expect(store.basicProfile?.nickname).not.toBe("不该生效");
    expect(store.errorMessage).toBe("network down");
  });

  // MP-R7-EDITPAGE-2（评审 medium：上传照片后照片墙即时回显缺失）：
  // real 后端 POST /profile/photos 返回整份 BasicProfileView 而非 {url}，
  // 旧实现 result.url 恒 undefined → 槽位被写入 undefined 渲染回「+」，
  // 重进页面重拉才显示。以下用例把两种响应形态的即时回显钉死。
  it("uploadPhotoAtIndex：BasicProfileView 形态响应（real）→ 照片墙整面权威同步、即时回显", async () => {
    const store = useProfileStore();
    store.photoGallery = ["https://cdn.example.com/p1.jpg"];
    vi.mocked(clientApi.uploadProfilePhoto).mockResolvedValue({
      nickname: "林晓",
      bio: "",
      grade: "大三",
      pronouns: "TA",
      photoGallery: [
        "https://cdn.example.com/p1.jpg",
        "https://cdn.example.com/p2-new.jpg",
      ],
    } as unknown as Awaited<ReturnType<typeof clientApi.uploadProfilePhoto>>);

    const url = await store.uploadPhotoAtIndex({ name: "a.jpg", path: "/tmp/a.jpg" }, 1);

    expect(url).toBe("https://cdn.example.com/p2-new.jpg");
    expect(store.photoGallery).toEqual([
      "https://cdn.example.com/p1.jpg",
      "https://cdn.example.com/p2-new.jpg",
    ]);
  });

  it("uploadPhotoAtIndex：{url} 形态响应（mock fixtures）→ 按稠密数组语义追加", async () => {
    const store = useProfileStore();
    store.photoGallery = ["https://cdn.example.com/p1.jpg"];
    vi.mocked(clientApi.uploadProfilePhoto).mockResolvedValue({ url: "https://cdn.example.com/p2-new.jpg" });

    const url = await store.uploadPhotoAtIndex({ name: "b.jpg", path: "/tmp/b.jpg" }, 1);

    expect(url).toBe("https://cdn.example.com/p2-new.jpg");
    expect(store.photoGallery).toEqual([
      "https://cdn.example.com/p1.jpg",
      "https://cdn.example.com/p2-new.jpg",
    ]);
  });

  it("uploadPhotoAtIndex：响应缺 URL 时不得把 undefined 写进槽位（旧缺陷的回归门）", async () => {
    const store = useProfileStore();
    store.photoGallery = ["https://cdn.example.com/p1.jpg"];
    vi.mocked(clientApi.uploadProfilePhoto).mockResolvedValue({} as Awaited<ReturnType<typeof clientApi.uploadProfilePhoto>>);

    await store.uploadPhotoAtIndex({ name: "c.jpg", path: "/tmp/c.jpg" }, 1);

    expect(store.photoGallery).toEqual(["https://cdn.example.com/p1.jpg"]);
    expect(store.photoGallery).not.toContain(undefined);
  });
});
