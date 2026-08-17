/**
 * 9 人素材角色表（v3 冻结 · 唯一事实源之一，与 docs/design/people-fixture.json 同步）。
 *
 * 约定：同一角色在任何页面（寻觅卡 / 匹配中 / 附近列表 / 消息头像 / 他人主页 / 匹配成功）
 * 必须使用同一组图片字段，禁止各页面各造别名。
 * - avatar    —— 1:1 方形头像（列表/聊天/评论）
 * - card      —— 4:5 主卡大图（寻觅卡 / 匹配候选卡）
 * - halfBody  —— 半身图（与 card 同源）
 * - background —— 个人主页背景
 * - gallery   —— 照片墙
 * - voice     —— 语音介绍（缺省留空）
 */
import { IMAGE_PATHS } from "./images";

export interface PersonRole {
  id: string;
  /** person-01..09 */
  assetId: string;
  name: string;
  initials: string;
  avatar: string;
  card: string;
  halfBody: string;
  background: string;
  gallery: string[];
  voice: string;
}

function person(index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): { avatar: string; card: string } {
  const avatarKey = `AVATAR_${index}` as keyof typeof IMAGE_PATHS.PEOPLE;
  const cardKey = `CARD_${index}` as keyof typeof IMAGE_PATHS.PEOPLE;
  return {
    avatar: IMAGE_PATHS.PEOPLE[avatarKey],
    card: IMAGE_PATHS.PEOPLE[cardKey],
  };
}

/** 9 人角色表（顺序 = person-01..09，冻结）。 */
export const peopleRoles: PersonRole[] = [
  { id: "person-01", assetId: "person-01", name: "林晓", initials: "林", ...person(1), voice: "" },
  { id: "person-02", assetId: "person-02", name: "夏言", initials: "夏", ...person(2), voice: "" },
  { id: "person-03", assetId: "person-03", name: "阿辰", initials: "阿", ...person(3), voice: "" },
  { id: "person-04", assetId: "person-04", name: "小满", initials: "小", ...person(4), voice: "" },
  { id: "person-05", assetId: "person-05", name: "Luna", initials: "L", ...person(5), voice: "" },
  { id: "person-06", assetId: "person-06", name: "草莓", initials: "草", ...person(6), voice: "" },
  { id: "person-07", assetId: "person-07", name: "苏奈", initials: "苏", ...person(7), voice: "" },
  { id: "person-08", assetId: "person-08", name: "周岚", initials: "周", ...person(8), voice: "" },
  { id: "person-09", assetId: "person-09", name: "林晚", initials: "林", ...person(9), voice: "" },
].map((r) => ({
  ...r,
  halfBody: r.card,
  background: r.card,
  gallery: [r.card],
}));
