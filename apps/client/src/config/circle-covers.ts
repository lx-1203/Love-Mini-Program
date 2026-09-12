/**
 * 兴趣圈名称 → 封面图 唯一映射（single source of truth）。
 *
 * 背景（2026-09-12 用户验收发现）：圈子列表页、圈子主页、首页兴趣推荐各自
 * 维护一份「圈名关键词 → CIRCLE_COVERS」映射，圈子主页的副本缺了
 * 阅读/宠物/考研/天文/篮球等关键词 → 列表显示专属封面、点进主页回退成
 * 默认摄影图（图文不一致）。本模块收编全部副本，任何页面一律引用
 * {@link circleCoverFor}，新增关键词只改这里。
 *
 * 匹配规则：按数组顺序首个命中的关键词生效（与原列表页实现一致）；
 * 未命中回退 CIRCLE_COVERS.DEFAULT（摄影封面）。
 */
import { IMAGE_PATHS } from "./images";

/** 关键词组 → 封面，顺序即匹配优先级 */
const CIRCLE_COVER_RULES: ReadonlyArray<readonly [string[], string]> = [
  [["摄影"], IMAGE_PATHS.CIRCLE_COVERS.PHOTO],
  [["旅行"], IMAGE_PATHS.CIRCLE_COVERS.TRAVEL],
  [["音乐"], IMAGE_PATHS.CIRCLE_COVERS.MUSIC],
  [["美食", "食"], IMAGE_PATHS.CIRCLE_COVERS.FOOD],
  [["运动", "篮球", "健身", "体育"], IMAGE_PATHS.CIRCLE_COVERS.SPORTS],
  [["阅读", "读书"], IMAGE_PATHS.CIRCLE_COVERS.READING],
  [["游戏", "桌游"], IMAGE_PATHS.CIRCLE_COVERS.GAME],
  [["宠物", "萌宠"], IMAGE_PATHS.CIRCLE_COVERS.PET],
  [["学习", "搭子"], IMAGE_PATHS.CIRCLE_COVERS.STUDY],
  [["考研", "深造", "学业"], IMAGE_PATHS.CIRCLE_COVERS.POSTGRAD],
  [["天文", "星空"], IMAGE_PATHS.CIRCLE_COVERS.ASTRONOMY],
];

/**
 * 按圈名解析封面图路径。
 *
 * @param name 圈子名称（空值/未命中安全回退默认封面）
 */
export function circleCoverFor(name: string | null | undefined): string {
  const n = (name || "").trim();
  if (n) {
    for (const [keywords, cover] of CIRCLE_COVER_RULES) {
      if (keywords.some((keyword) => n.includes(keyword))) {
        return cover;
      }
    }
  }
  return IMAGE_PATHS.CIRCLE_COVERS.DEFAULT;
}
