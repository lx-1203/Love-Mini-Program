/**
 * useTabBar — 同步自定义 TabBar 选中状态
 *
 * 在 uni-app 自定义 TabBar 模式下（pages.json 中 tabBar.custom: true），
 * 每个 Tab 页必须在 onShow 中调用 getTabBar().setData({ selected: N })
 * 来告知 TabBar 组件当前选中的是哪个 tab，否则图标和选中状态不会更新。
 *
 * 用法：
 *   useTabBar(0);  // 在 pages/discover/index.vue 中
 *   useTabBar(1);  // 在 pages/village/index.vue 中
 *   useTabBar(2);  // 在 pages/home/index.vue 中
 *   useTabBar(3);  // 在 pages/chat/index.vue 中
 *   useTabBar(4);  // 在 pages/profile/index.vue 中
 */
import { onShow } from "@dcloudio/uni-app";

/**
 * mp-weixin 自定义 TabBar 页面实例的最小契约
 *
 * getCurrentPages() 返回的页面实例在 Vue3 mp-weixin 下包含 getTabBar() 方法，
 * 但官方类型未声明，此处通过接口扩展补齐字段，避免使用 `as any` 绕过类型检查。
 */
interface PageWithTabBar {
  getTabBar?: () => {
    setData?: (data: { selected: number }) => void;
  } | null;
}

export function useTabBar(index: number): void {
  onShow(() => {
    // #ifdef MP-WEIXIN
    try {
      // uni-app Vue3 mp-weixin 中必须通过 getCurrentPages() 获取页面实例
      // getCurrentInstance()?.proxy 在 mp-weixin 中不可用
      const pages = getCurrentPages();
      const page = pages[pages.length - 1] as PageWithTabBar | undefined;
      const tabBar = page?.getTabBar?.();
      if (tabBar && typeof tabBar.setData === "function") {
        tabBar.setData({ selected: index });
      }
    } catch (_e) {
      // 静默失败，不影响页面正常渲染
    }
    // #endif
  });
}
