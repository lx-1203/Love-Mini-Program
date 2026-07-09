import type { App } from "vue";

const createMockGsap = () => ({
  to: () => ({ kill: () => {} }),
  from: () => ({ kill: () => {} }),
  fromTo: () => ({ kill: () => {} }),
  set: () => {},
  timeline: () => {
    const mockTimeline: any = {};
    mockTimeline.to = () => mockTimeline;
    mockTimeline.from = () => mockTimeline;
    mockTimeline.fromTo = () => mockTimeline;
    mockTimeline.kill = () => {};
    mockTimeline.play = () => mockTimeline;
    mockTimeline.pause = () => mockTimeline;
    return mockTimeline;
  },
  registerPlugin: () => {},
  context: () => ({ add: () => {}, revert: () => {} }),
});

let gsap: any = createMockGsap();

// H5 环境下使用静态 import 加载 gsap（ESM 方式，避免 require 在浏览器端报错）
// #ifdef H5
import * as gsapModule from "gsap";
gsap = (gsapModule as any).default || gsapModule;
// #endif

export default {
  install(app: App) {
    app.config.globalProperties.$gsap = gsap;
    app.provide("gsap", gsap);
  },
};

export { gsap };
