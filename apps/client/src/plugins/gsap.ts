import type { App } from "vue";

/**
 * GSAP 核心 API 的最小契约（仅声明业务代码使用的方法）。
 *
 * 真实 gsap 模块的类型较为复杂，且 mp-weixin 端需使用 mock 实现兜底，
 * 此处通过最小接口收敛形态，避免引入完整 gsap 类型依赖。
 */
interface GsapLike {
  to: () => { kill: () => void };
  from: () => { kill: () => void };
  fromTo: () => { kill: () => void };
  set: () => void;
  timeline: () => GsapTimeline;
  registerPlugin: () => void;
  context: () => { add: () => void; revert: () => void };
}

/** gsap.timeline() 返回的链式调用实例 */
interface GsapTimeline {
  to: () => GsapTimeline;
  from: () => GsapTimeline;
  fromTo: () => GsapTimeline;
  kill: () => void;
  play: () => GsapTimeline;
  pause: () => GsapTimeline;
}

const createMockGsap = (): GsapLike => ({
  to: () => ({ kill: () => {} }),
  from: () => ({ kill: () => {} }),
  fromTo: () => ({ kill: () => {} }),
  set: () => {},
  timeline: () => {
    const mockTimeline: GsapTimeline = {
      to: () => mockTimeline,
      from: () => mockTimeline,
      fromTo: () => mockTimeline,
      kill: () => {},
      play: () => mockTimeline,
      pause: () => mockTimeline,
    };
    return mockTimeline;
  },
  registerPlugin: () => {},
  context: () => ({ add: () => {}, revert: () => {} }),
});

let gsap: GsapLike = createMockGsap();

// H5 环境下使用静态 import 加载 gsap（ESM 方式，避免 require 在浏览器端报错）
// #ifdef H5
import * as gsapModule from "gsap";
// gsapModule 形态可能是 { default: gsap } 或 namespace 本身，通过类型守卫收敛
const resolvedGsap: unknown = (gsapModule as { default?: unknown }).default ?? gsapModule;
gsap = resolvedGsap as GsapLike;
// #endif

export default {
  install(app: App) {
    app.config.globalProperties.$gsap = gsap;
    app.provide("gsap", gsap);
  },
};

export { gsap };
