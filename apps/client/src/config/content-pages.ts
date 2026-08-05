/**
 * 内容页后台配置（任务 E3）
 *
 * 三个内容页（附近的人 / MBTI 人格测试 / 恋爱咨询课程）支持后台配置 H5 URL：
 * - 非空字符串：页面 onLoad 时读取配置，渲染 <web-view :src="url" /> 加载该 URL；
 * - 空字符串（默认）：未配置，页面展示本地示例内容。
 *
 * 配置来源可后续接入运营后台 / 远程配置下发，当前为静态常量。
 */
export const contentPageUrls = {
  /** 附近的人 H5 URL（空 = 未配置，展示本地示例） */
  nearbyUrl: "",
  /** MBTI 人格测试 H5 URL（空 = 未配置，展示本地示例） */
  mbtiUrl: "",
  /** 恋爱咨询课程 H5 URL（空 = 未配置，展示本地示例） */
  consultingUrl: "",
} as const;
