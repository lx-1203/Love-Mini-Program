/**
 * 内容页后台配置（任务 E3 + 2026-08-07 接入真实外部资源）
 *
 * 内容页（附近的人 / MBTI 人格测试 / 恋爱咨询课程）支持后台配置 H5 URL：
 * - 非空字符串：页面 onLoad 时读取配置，渲染 <web-view :src="url" /> 加载该 URL；
 * - 空字符串（默认）：未配置，页面展示本地示例内容。
 *
 * 2026-08-07 落地：
 * - mbtiUrl：十六型 MBTI 本土化免费测试（https://www.16types.com），
 *   恋爱 / 社交适配测试，免费出完整人格报告；
 * - consultingUrl：国家高等教育智慧教育平台《爱情心理学》免费权威课
 *   （https://higher.smartedu.cn/course/697a7a1295df98bb27a0942c）。
 *
 * 注意：小程序正式发布需在微信公众平台将上述域名加入 web-view 业务域名白名单；
 * 开发者工具勾选「不校验合法域名」即可本地预览。
 *
 * 配置来源可后续接入运营后台 / 远程配置下发，当前为静态常量。
 */
export const contentPageUrls = {
  /** 附近的人 H5 URL（空 = 未配置，展示本地示例） */
  nearbyUrl: "",
  /** MBTI 人格测试 H5 URL（十六型本土化测试） */
  mbtiUrl: "https://www.16types.com",
  /** 恋爱咨询课程 H5 URL（国家高等教育智慧教育平台《爱情心理学》） */
  consultingUrl: "https://higher.smartedu.cn/course/697a7a1295df98bb27a0942c",
} as const;
