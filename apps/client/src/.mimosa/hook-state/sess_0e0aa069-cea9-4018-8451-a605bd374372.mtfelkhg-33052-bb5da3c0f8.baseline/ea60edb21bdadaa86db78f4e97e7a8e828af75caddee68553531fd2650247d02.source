/**
 * useTabBar — 同步自定义 TabBar 选中状态
 *
 * 在 uni-app 自定义 TabBar 模式下（pages.json 中 tabBar.custom: true），
 * 每个 Tab 页必须在 onShow 中调用 getTabBar().setData({ selected: N })
 * 来告知 TabBar 组件当前选中的是哪个 tab，否则图标和选中状态不会更新。
 *
 * 用法（tab 顺序：首页、匹配、圈子、消息、我的）：
 *   useTabBar(0);  // 在 pages/home/index.vue 中
 *   useTabBar(1);  // 在 pages/discover/index.vue 中
 *   useTabBar(2);  // 在 pages/village/index.vue 中
 *   useTabBar(3);  // 在 pages/messages/index.vue 中（R4-00210：旧 /pages/chat/index 已移除注册）
 *   useTabBar(4);  // 在 pages/profile/index.vue 中
 */
import { onShow } from "@dcloudio/uni-app";
// Task 35：平台特定逻辑收敛到 compat/index.ts，避免业务代码散落 #ifdef 条件编译
import { getTabBarInstance } from "../compat";

/**
 * 同步自定义 TabBar 选中状态。
 *
 * 在 onShow 时调用 TabBar 实例的 setData({ selected: index })，
 * 告知 TabBar 组件当前选中的 tab，确保图标与选中态正确更新。
 * 非 mp-weixin 平台 getTabBarInstance 返回 null，自动跳过。
 *
 * @param index - 当前 Tab 索引（与 custom-tab-bar/index.js 中 tabs 数组顺序一致）
 */
export function useTabBar(index: number): void {
  onShow(() => {
    // Task 35：mp-weixin TabBar 实例获取收敛到 compat/index.ts 的 getTabBarInstance()
    // 其他平台返回 null，无需 #ifdef 条件编译分支
    const tabBar = getTabBarInstance();
    if (tabBar && typeof tabBar.setData === "function") {
      tabBar.setData({ selected: index });
    }
  });
}
