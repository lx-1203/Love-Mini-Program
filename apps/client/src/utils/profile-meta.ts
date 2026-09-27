/** 个人资料 meta 行的统一口径：年龄 · 学校 · 城市。
 *
 *  两张理想效果图（素材/理想效果图/已经填完资料的个人主页.png 的「21岁 · 北京大学 · 北京」、
 *  他人显示主页.png 同序）都是这个顺序，而后端 `basic.location` 串本体是「城市 · 学校」
 *  （见 services/api 的 UserProfileDTO 示例 "北京 · 北京大学"）⇒ 整串直出会渲染成反序，
 *  必须拆开重排。MP-R2VIS-SUBPACKAGES-PROFILE-EXTRA-PROFILE-OTHER-001 的缺陷面就是
 *  「我的页」整串直出而「他人页」重排，两页同一份数据两种顺序。
 */
export interface ProfileMetaSource {
  age?: number | string | null;
  location?: string | null;
}

export function profileMetaParts(basic: ProfileMetaSource): string[] {
  const parts: string[] = [];
  if (basic.age) parts.push(`${basic.age}岁`);
  const [cityPart, schoolPart] = String(basic.location || "").split("·").map((s) => s.trim());
  if (schoolPart) parts.push(schoolPart);
  if (cityPart) parts.push(cityPart);
  return parts;
}

export function profileMetaLine(basic: ProfileMetaSource): string {
  return profileMetaParts(basic).join(" · ");
}
