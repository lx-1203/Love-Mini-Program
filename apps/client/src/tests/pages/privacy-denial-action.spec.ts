import { beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { i18n } from "../../i18n";

/**
 * 隐私授权被拒时的动作层行为（第六轮 W2-5，W2b 运行时腿）。
 *
 * <p>静态门（`privacy-gate-wiring.spec.ts`）判的是「守卫在不在动作路径上」；
 * 本文件判的是被拒之后**这一次动作到底有没有停下来**：
 * 选图接口不许被调用、页面态不许出现已选图、上传/提交请求一条都不发、
 * 成功文案一条都不弹——只弹「需同意隐私协议」这一句。</p>
 *
 * <p>两页刻意选**两种不同的守卫写法**，因为静态门对这两种写法分别放行：
 * <ul>
 *   <li>`subpackages/profile-extra/verification/index.vue` — `try { await ensurePrivacyAuthorized() } catch { toast; return }`
 *       （守卫与 chooseImage 同函数，实名证件写库链路，越权代价最高）；</li>
 *   <li>`subpackages/support/feedback/index.vue` — `void ensurePrivacyAuthorized().then(() => chooseImageInternal())`
 *       （守卫在调用方、越权调用在被派生的 `chooseImageInternal`，
 *       静态门靠一跳对账才认它，所以运行时必须单独证一次这条链真的被守住）。</li>
 * </ul>
 * 每页都带一条阳性对照（授权通过 ⇒ 选图接口确实被调用），
 * 否则「一次都没调用」这个断言会因为夹具本身点不着而恒绿。</p>
 */

const hooks = vi.hoisted(() => ({
  onLoad: [] as Array<(query?: Record<string, unknown>) => unknown>,
  onShow: [] as Array<() => unknown>,
}));

vi.mock("@dcloudio/uni-app", () => ({
  onLoad: (cb: (query?: Record<string, unknown>) => unknown) => {
    hooks.onLoad.push(cb);
  },
  onShow: (cb: () => unknown) => {
    hooks.onShow.push(cb);
  },
  onHide: () => {},
  onUnload: () => {},
  onReady: () => {},
  onReachBottom: () => {},
  onPullDownRefresh: () => {},
  onShareAppMessage: () => {},
}));

const privacy = vi.hoisted(() => ({
  ensurePrivacyAuthorized: vi.fn<[], Promise<void>>(() => Promise.reject({ reason: "unauthorized" })),
}));

vi.mock("../../utils/privacy", () => ({
  ensurePrivacyAuthorized: privacy.ensurePrivacyAuthorized,
  checkPrivacySetting: vi.fn(() => Promise.resolve({ status: "unauthorized", needAuthorization: true, privacyContractName: "" })),
  requirePrivacyAuthorize: vi.fn(() => Promise.reject({ reason: "unauthorized" })),
  isPrivacyApiSupported: vi.fn(() => true),
  openPrivacyContract: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../stores/helpers/use-mock", () => ({ useMock: () => false }));
vi.mock("../../services/env", () => ({ isMockMode: () => false }));

const httpCalls = vi.hoisted(() => [] as Array<{ url: string; method?: string }>);
vi.mock("../../services/http", () => ({
  request: vi.fn((options: { url: string; method?: string }) => {
    httpCalls.push({ url: options.url, method: options.method });
    return Promise.resolve(null);
  }),
  getToken: () => null,
  clearTokens: () => {},
}));

const api = vi.hoisted(() => ({
  uploadPostImage: vi.fn(() => Promise.resolve({ url: "https://cdn/student-card.png" })),
  uploadFeedbackImage: vi.fn(() => Promise.resolve({ url: "https://cdn/feedback.png" })),
  deleteDraft: vi.fn(() => Promise.resolve()),
}));
vi.mock("../../services/api", () => ({ clientApi: api }));

vi.mock("../../utils/media", () => ({
  resolveMediaUrl: (v: string) => v,
  isUploadedMediaUrl: () => false,
  chooseImages: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../../composables/useMenuButtonRect", () => ({
  useMenuButtonRect: () => ({ styleVars: {} }),
}));

vi.mock("../../stores/feedback", () => ({
  useFeedbackStore: () =>
    reactive({
      submissions: [] as unknown[],
      errorMessage: null as string | null,
      load: vi.fn(() => Promise.resolve()),
      submitIssue: vi.fn(() => Promise.resolve(true)),
      submitSuggestion: vi.fn(() => Promise.resolve(true)),
      submitActivityProposal: vi.fn(() => Promise.resolve(true)),
    }),
}));

import VerificationPage from "../../subpackages/profile-extra/verification/index.vue";
import FeedbackPage from "../../subpackages/support/feedback/index.vue";

type UiSpy = ReturnType<typeof vi.fn>;
interface UniProbe {
  chooseImage: UiSpy;
  showToast: UiSpy;
  toastTitles: string[];
}

function installUniProbe(): UniProbe {
  const target = globalThis as unknown as { uni: Record<string, UiSpy | unknown> };
  const chooseImage = vi.fn((opts?: { success?: (res: unknown) => void }) => {
    // 真机上这一步会返回用户选的图；这里只在「被调用」这件事本身做判点，
    // 成功回调留在阳性对照用例里手工触发一次，证明选图链路是通的。
    opts?.success?.({ tempFilePaths: ["wxfile://tmp/picked.png"], tempFiles: [{ size: 1024, path: "wxfile://tmp/picked.png" }] });
  });
  const showToast = vi.fn((opts: { title?: string }) => {
    if (typeof opts?.title === "string") probe.toastTitles.push(opts.title);
  });
  const probe: UniProbe = { chooseImage, showToast, toastTitles: [] };
  target.uni.chooseImage = chooseImage;
  target.uni.showToast = showToast;
  target.uni.showModal = vi.fn();
  target.uni.showLoading = vi.fn();
  target.uni.hideLoading = vi.fn();
  target.uni.previewImage = vi.fn();
  target.uni.uploadFile = vi.fn();
  target.uni.createSelectorQuery = vi.fn(() => ({
    select: () => ({ boundingClientRect: () => ({ exec: () => {} }) }),
    exec: () => {},
  }));
  return probe;
}

let probe: UniProbe;

const shellStub = { template: "<div><slot /></div>" };

function mountVerification(): VueWrapper {
  return mount(VerificationPage, {
    global: {
      plugins: [i18n],
      stubs: {
        AppShell: shellStub,
        SkeletonBlock: true,
        "skeleton-block": true,
      },
    },
  });
}

function mountFeedback(): VueWrapper {
  return mount(FeedbackPage, {
    global: {
      plugins: [i18n],
      stubs: {
        AppShell: shellStub,
        SectionCard: shellStub,
        "section-card": shellStub,
        BottomActionBar: shellStub,
        "bottom-action-bar": shellStub,
        StatusState: true,
        "status-state": true,
        EmptyState: true,
        "empty-state": true,
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  httpCalls.length = 0;
  hooks.onLoad.length = 0;
  hooks.onShow.length = 0;
  privacy.ensurePrivacyAuthorized.mockImplementation(() => Promise.reject({ reason: "unauthorized" }));
  probe = installUniProbe();
  // 本页 onLoad 会拉认证状态（走 request 桩，返回 null ⇒ 未认证态，上传卡可见）
  i18n.global.locale.value = "zh-CN";
});

describe("隐私授权被拒 ⇒ 动作不发生（W2-5 运行时腿）", () => {
  it("恋爱认证页：授权被拒 ⇒ 不调 chooseImage、不出现已选图、不上传、只弹隐私提示", async () => {
    const wrapper = mountVerification();
    await flushPromises();
    for (const cb of hooks.onShow) await cb();
    await flushPromises();

    const uploadCard = wrapper.find(".upload-card");
    expect(uploadCard.exists(), "未认证态应渲染上传卡（夹具前提）").toBe(true);
    await uploadCard.trigger("tap");
    await flushPromises();
    await flushPromises();

    expect(probe.chooseImage, "授权被拒后不得调用隐私接口 chooseImage").not.toHaveBeenCalled();
    expect(api.uploadPostImage, "授权被拒后不得上传学生证图片").not.toHaveBeenCalled();
    expect(
      httpCalls.filter((c) => c.method === "POST"),
      "授权被拒后不得发出任何写请求",
    ).toEqual([]);
    expect(probe.toastTitles).toContain("需同意隐私协议后才能选择图片");
    expect(probe.toastTitles).not.toContain("学生证已上传");
    // 「已选图」的可见形态：上传卡的空态占位仍在（uploadedImagePath 没被赋值）
    expect(wrapper.find(".upload-card__empty").exists()).toBe(true);
    wrapper.unmount();
  });

  it("恋爱认证页：阳性对照——授权通过时 chooseImage 确实被调用（证明上一断言不是空跑）", async () => {
    privacy.ensurePrivacyAuthorized.mockImplementation(() => Promise.resolve());
    const wrapper = mountVerification();
    await flushPromises();
    const uploadCard = wrapper.find(".upload-card");
    await uploadCard.trigger("tap");
    await flushPromises();
    await flushPromises();

    expect(probe.chooseImage).toHaveBeenCalledTimes(1);
    expect(wrapper.find(".upload-card__empty").exists()).toBe(false);
    wrapper.unmount();
  });

  it("反馈页（.then 派生守卫形态）：授权被拒 ⇒ chooseImageInternal 一条都不走", async () => {
    const wrapper = mountFeedback();
    await flushPromises();

    const addCell = wrapper.find(".image-cell--add");
    expect(addCell.exists(), "反馈表单应渲染「添加图片」格子（夹具前提）").toBe(true);
    await addCell.trigger("tap");
    await flushPromises();
    await flushPromises();

    expect(probe.chooseImage, "守卫在调用方、越权点在被派生函数：被拒后该函数一条都不许走").not.toHaveBeenCalled();
    expect(api.uploadFeedbackImage, "授权被拒后不得上传反馈附图").not.toHaveBeenCalled();
    expect(probe.toastTitles).toContain("需同意隐私协议后才能选择图片");
    expect(probe.toastTitles).not.toContain("图片上传成功");
    wrapper.unmount();
  });

  it("反馈页：阳性对照——授权通过时派生函数真的被走（证明 .then 链没被我的桩掐断）", async () => {
    privacy.ensurePrivacyAuthorized.mockImplementation(() => Promise.resolve());
    const wrapper = mountFeedback();
    await flushPromises();

    await wrapper.find(".image-cell--add").trigger("tap");
    await flushPromises();
    await flushPromises();

    expect(probe.chooseImage).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
