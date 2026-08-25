/**
 * 校园圈渐变底色共享配置（第五轮 QA 一致性收敛）。
 *
 * <p>背景：校园圈卡片（hub.vue / nearby/index.vue）需要"每校一色"的渐变作为
 * 首字徽标底色。原先 hub.vue 内联 CAMPUS_GRADIENTS，nearby 页用 school-main.png
 * 封面插图（第五轮移除封面插图改为名字+首字+渐变）。</p>
 *
 * <p>收敛为单一真相源：hub.vue 与 nearby/index.vue 共用本模块，避免双份硬编码
 * 渐变值漂移；新增学校校色只需改本文件一处。</p>
 *
 * <p>风格参考：素材/理想效果图/兴趣圈列表.png 的卡片视觉调性（品牌绿/紫/红/蓝
 * 等多色系渐变，每校一色提升辨识度）。</p>
 */

/** 校园圈渐变底色映射（schoolId → CSS linear-gradient 字符串） */
export const CAMPUS_GRADIENTS: Record<string, string> = {
  pku: "linear-gradient(135deg, #4A90A4 0%, #357A8C 100%)",
  thu: "linear-gradient(135deg, #8B6914 0%, #A0522D 100%)",
  ruc: "linear-gradient(135deg, #7B68AE 0%, #5B4C9A 100%)",
  fudan: "linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)",
  sjtu: "linear-gradient(135deg, #C62828 0%, #8E0000 100%)",
  tongji: "linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)",
  zju: "linear-gradient(135deg, #00695C 0%, #004D40 100%)",
};

/** 默认校园渐变（兜底色） */
export const DEFAULT_CAMPUS_GRADIENT =
  "linear-gradient(135deg, #36C99A 0%, #2BA882 100%)";

/**
 * 获取指定学校 ID 的渐变样式；未匹配时回退默认渐变。
 *
 * @param schoolId 学校 ID（如 "pku"/"thu"），未知值返回品牌色默认渐变
 * @returns CSS linear-gradient 字符串
 */
export function campusGradientFor(schoolId: string): string {
  return CAMPUS_GRADIENTS[schoolId] || DEFAULT_CAMPUS_GRADIENT;
}