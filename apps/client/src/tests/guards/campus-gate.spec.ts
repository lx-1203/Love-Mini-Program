import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 校园/认证门控守卫（guards/campus-gate.ts）单测。
 *
 * 覆盖该文件导出的全部决策面（B4 认证门控，2026-08-13）：
 * - isRealNameVerified：mock 档短路 / 学历认证通过即视为实名（后端强制实名前置）/
 *   BasicProfile.idCardVerified 判定 / profile 未加载按未认证处理（保持同步语义）；
 * - isEducationVerified：mock 档短路 / 真实模式仅认 userSession.campusVerified === true；
 * - ensureCertified：通过放行且不弹窗；未通过返回 false 并弹 i18n 引导弹窗，
 *   confirm 才跳对应认证页（realname → REAL_NAME_CERTIFICATION，
 *   education → CAMPUS.CERTIFICATION），cancel 不发起跳转；isDev 下补 console.warn。
 *
 * 桩方式与相邻的 guest-access.spec.ts 一致：vi.hoisted 桩 + vi.mock 模块级替换，
 * session/profile 数据按用例注入；isDev 用 getter 注入（config/showcase 同款手法），
 * config/env 其余导出保持真实实现，避免连带破坏 i18n/routes 等被波及模块。
 */

const mocks = vi.hoisted(() => ({
  mockBand: { value: false },
  // campus-gate 只读这两个字段，桩值与真实 UserSession / BasicProfile 同形即可
  userSession: { value: null as { campusVerified?: boolean } | null },
  basicProfile: { value: null as { idCardVerified?: boolean } | null },
  isDev: { value: false },
  openAppPath: vi.fn(),
}));

vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: () => mocks.mockBand.value,
}));

vi.mock("../../stores/session", () => ({
  useSessionStore: () => ({ userSession: mocks.userSession.value }),
}));

vi.mock("../../stores/profile", () => ({
  useProfileStore: () => ({ basicProfile: mocks.basicProfile.value }),
}));

// 跳转出口整个桩掉：只断言「跳了哪个常量路径」，不带进 route band 等无关闸门
vi.mock("../../utils/navigation", () => ({ openAppPath: mocks.openAppPath }));

vi.mock("../../config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env")>();
  return {
    ...actual,
    get isDev() {
      return mocks.isDev.value;
    },
  };
});

import {
  ensureCertified,
  isEducationVerified,
  isRealNameVerified,
} from "../../guards/campus-gate";
import { ROUTES } from "../../constants/routes";
import { t } from "../../i18n";

type UniStub = { showModal: ReturnType<typeof vi.fn> };
let uniStub: UniStub;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mocks.mockBand.value = false;
  mocks.userSession.value = null;
  mocks.basicProfile.value = null;
  mocks.isDev.value = false;
  mocks.openAppPath.mockClear();
  uniStub = { showModal: vi.fn() };
  vi.stubGlobal("uni", uniStub);
  // isDev 调试日志统一收口到 spy：既不污染测试输出，又能在专门用例里断言调用参数
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  vi.unstubAllGlobals();
});

describe("campus-gate 认证门控", () => {
  describe("isRealNameVerified 实名判定", () => {
    it("mock 档恒通过：useMock 短路发生在任何数据判定之前（演示账号不设卡）", () => {
      mocks.mockBand.value = true;
      // 会话与资料都按「未认证」给桩，mock 仍必须放行，才能证明短路顺序正确
      mocks.userSession.value = { campusVerified: false };
      mocks.basicProfile.value = { idCardVerified: false };
      expect(isRealNameVerified()).toBe(true);
    });

    it("已通过学历认证 ⇒ 视为已满足实名（后端强制实名前置），basicProfile 未加载也放行", () => {
      mocks.userSession.value = { campusVerified: true };
      mocks.basicProfile.value = null;
      expect(isRealNameVerified()).toBe(true);
    });

    it("未过学历认证时以 BasicProfile.idCardVerified === true 为准", () => {
      mocks.userSession.value = { campusVerified: false };
      mocks.basicProfile.value = { idCardVerified: true };
      expect(isRealNameVerified()).toBe(true);
      mocks.basicProfile.value = { idCardVerified: false };
      expect(isRealNameVerified()).toBe(false);
    });

    it("profile 未加载（basicProfile 为 null）按未认证处理：门控保持同步语义，不发起异步加载", () => {
      mocks.userSession.value = { campusVerified: false };
      mocks.basicProfile.value = null;
      expect(isRealNameVerified()).toBe(false);
    });
  });

  describe("isEducationVerified 学历判定", () => {
    it("mock 档恒通过", () => {
      mocks.mockBand.value = true;
      mocks.userSession.value = null;
      expect(isEducationVerified()).toBe(true);
    });

    it("真实模式：仅 userSession.campusVerified === true 视为已通过，未登录/未认证一律不通过", () => {
      mocks.userSession.value = { campusVerified: true };
      expect(isEducationVerified()).toBe(true);
      mocks.userSession.value = { campusVerified: false };
      expect(isEducationVerified()).toBe(false);
      mocks.userSession.value = null;
      expect(isEducationVerified()).toBe(false);
    });
  });

  describe("ensureCertified 认证门控", () => {
    it("已通过实名：ensureCertified('realname') 放行且不弹窗", () => {
      mocks.basicProfile.value = { idCardVerified: true };
      expect(ensureCertified("realname")).toBe(true);
      expect(uniStub.showModal).not.toHaveBeenCalled();
      expect(mocks.openAppPath).not.toHaveBeenCalled();
    });

    it("已通过学历：ensureCertified('education') 放行且不弹窗", () => {
      mocks.userSession.value = { campusVerified: true };
      expect(ensureCertified("education")).toBe(true);
      expect(uniStub.showModal).not.toHaveBeenCalled();
      expect(mocks.openAppPath).not.toHaveBeenCalled();
    });

    it("未过实名：返回 false 并弹实名引导弹窗（i18n 文案），confirm 跳实名认证页", () => {
      mocks.userSession.value = { campusVerified: false };
      expect(ensureCertified("realname")).toBe(false);
      expect(uniStub.showModal).toHaveBeenCalledTimes(1);
      const opts = uniStub.showModal.mock.calls[0][0] as {
        title: string;
        content: string;
        confirmText: string;
        cancelText: string;
        success: (res: { confirm: boolean }) => void;
      };
      // 文案键钉住：换键/漏键都会让这里的 t() 对不上（与 guest-access.spec 同一口径）
      expect(opts.title).toBe(t("campus.gateTitle"));
      expect(opts.content).toBe(t("campus.gateHint"));
      expect(opts.confirmText).toBe(t("campus.gateGoCertify"));
      expect(opts.cancelText).toBe(t("common.cancel"));
      opts.success({ confirm: true });
      expect(mocks.openAppPath).toHaveBeenCalledTimes(1);
      expect(mocks.openAppPath).toHaveBeenCalledWith(ROUTES.REAL_NAME_CERTIFICATION);
    });

    it("未过学历：弹学历引导弹窗（i18n 文案），confirm 跳校园认证页", () => {
      mocks.userSession.value = { campusVerified: false };
      expect(ensureCertified("education")).toBe(false);
      const opts = uniStub.showModal.mock.calls[0][0] as {
        title: string;
        content: string;
        confirmText: string;
        success: (res: { confirm: boolean }) => void;
      };
      expect(opts.title).toBe(t("campus.gateEducationTitle"));
      expect(opts.content).toBe(t("campus.gateEducationHint"));
      expect(opts.confirmText).toBe(t("campus.gateEducationGo"));
      opts.success({ confirm: true });
      expect(mocks.openAppPath).toHaveBeenCalledTimes(1);
      expect(mocks.openAppPath).toHaveBeenCalledWith(ROUTES.CAMPUS.CERTIFICATION);
    });

    it("弹窗 cancel：不发起任何跳转（留在原页面）", () => {
      mocks.userSession.value = { campusVerified: false };
      expect(ensureCertified("realname")).toBe(false);
      const opts = uniStub.showModal.mock.calls[0][0] as {
        success: (res: { confirm: boolean }) => void;
      };
      opts.success({ confirm: false });
      expect(mocks.openAppPath).not.toHaveBeenCalled();
    });

    it("isDev 下拦截时补 console.warn 调试日志（含 level 与 campusVerified 现场值）", () => {
      mocks.isDev.value = true;
      mocks.userSession.value = { campusVerified: false };
      expect(ensureCertified("education")).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith("[campus-gate] 拦截：未通过认证", {
        level: "education",
        campusVerified: false,
      });
    });
  });
});
