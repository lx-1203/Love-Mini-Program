import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { i18n } from "../../i18n";

/**
 * 法律文本页（components/common/LegalTextPage.vue）渲染来源回归用例（S2-6）。
 *
 * 钉两件事：
 *   1. 上屏正文 = 服务端 CMS 下发的那一份（标题/版本/更新时间同源，卡片头不再与页头同文重复）；
 *   2. getLegalText 返回离线兜底时，页面必须**披露**它是兜底（药丸上屏、
 *      不印版本号、不印任何前端自造日期），而不是把兜底摘要伪装成正式条款。
 *
 * 这里 mock 掉 config/legal-texts（取数链路本身另有
 * src/tests/config/legal-texts.spec.ts 覆盖），本用例只验证「页面呈现的是谁的文字」。
 */
const getLegalTextMock = vi.hoisted(() => vi.fn());

vi.mock("../../config/legal-texts", () => ({
  getLegalText: getLegalTextMock,
  LegalTextType: {
    USER_AGREEMENT: "user_agreement",
    PRIVACY_POLICY: "privacy_policy",
  },
}));

import LegalTextPage from "../../components/common/LegalTextPage.vue";
import { LegalTextType } from "../../config/legal-texts";

const CMS_VIEW = {
  type: "user_agreement",
  title: "用户协议",
  content: "1. 协议范围与接受：这是 legal_document 表里的正式条款。\n2. 联系方式：请通过反馈中心提交。",
  version: "v9.1.0",
  updatedAt: "2026-10-20T10:15:30",
};

const FALLBACK_VIEW = {
  type: "user_agreement",
  title: "用户协议",
  content: "【离线兜底摘要 · 非正式文本】\n当前设备连不到服务端，这里只给出要点摘要。",
  version: "local-fallback",
  updatedAt: "",
};

function mountPage() {
  return mount(LegalTextPage, {
    props: {
      legalType: LegalTextType.USER_AGREEMENT,
      i18nPrefix: "legal.userAgreement",
    },
    global: {
      plugins: [i18n],
      stubs: {
        view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        "scroll-view": { template: '<div class="mock-scroll"><slot /></div>', name: "uni-scroll-view" },
      },
    },
  });
}

describe("LegalTextPage — 正文渲染来源", () => {
  beforeEach(() => {
    getLegalTextMock.mockReset();
  });

  it("渲染服务端 CMS 正文（而不是语言包里的副本）", async () => {
    getLegalTextMock.mockResolvedValue(CMS_VIEW);
    const wrapper = mountPage();
    await flushPromises();

    const body = wrapper.find(".legal-content__text").text();
    expect(body).toContain("这是 legal_document 表里的正式条款");
    expect(wrapper.find(".legal-header__version").text()).toBe("v9.1.0");
    expect(wrapper.find(".legal-header__updated").text()).toContain("2026-10-20");
    // CMS 态不出兜底披露
    expect(wrapper.findAll(".legal-header__fallback")).toHaveLength(0);
  });

  it("后端标题与页头 i18n 标题不同文时，卡片头补出后端标题（同文则不重复排两次）", async () => {
    getLegalTextMock.mockResolvedValue({ ...CMS_VIEW, title: "用户协议（2026 修订版）" });
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find(".legal-header__title").text()).toBe("用户协议（2026 修订版）");
  });

  it("拉取失败落兜底：正文是离线摘要，且披露药丸上屏、版本号与日期一律不印", async () => {
    getLegalTextMock.mockResolvedValue(FALLBACK_VIEW);
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find(".legal-content__text").text()).toContain("离线兜底摘要");
    expect(wrapper.find(".legal-header__fallback").text()).toContain("本地兜底文本");
    // 兜底态的披露在签署动作那一刻也必须在场（吸底条内）
    expect(wrapper.find(".legal-footer__fallback").text()).toContain("非正式版本");
    // 前端不许自造合规文本的时间戳（R11-L13-D16）
    expect(wrapper.findAll(".legal-header__updated")).toHaveLength(0);
    expect(wrapper.findAll(".legal-header__version")).toHaveLength(0);
    expect(wrapper.text()).not.toMatch(/\d{4}-\d{2}-\d{2}/u);
  });

  it("空正文响应走 empty 态并可重试（不许渲染成空白正式条款）", async () => {
    getLegalTextMock.mockResolvedValue({ type: "user_agreement", title: "用户协议", content: "  " });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find(".legal-state--empty").exists()).toBe(true);
    expect(wrapper.find(".legal-state__btn").text()).toContain("重试");
  });

  it("上屏正文做标点归一：半角引号成对转全角、入口名统一带「」", async () => {
    getLegalTextMock.mockResolvedValue({
      ...CMS_VIEW,
      content: '（以下简称"本服务"）请通过小程序内反馈中心提交。',
    });
    const wrapper = mountPage();
    await flushPromises();

    const body = wrapper.find(".legal-content__text").text();
    expect(body).toContain("“本服务”");
    expect(body).toContain("「反馈中心」");
  });
});
