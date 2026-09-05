/**
 * 2026-09-03（修复：附近头像缺失/关系动态缩略图缺失）：
 * vite 静态资源按需打包，源码字符串引用（如 IMAGE_PATHS.CARD_N）不会被
 * 收集到 dist。后端按 userId 派发 person-01 ~ person-09 共 9 种头像 URL，
 * 运行时拼装后访问这 9 张 PNG。dist 仅含被源码 import 命中的 5 张
 * （person-01 ~ 05），导致 id%9 对应 6-9 的体验账号头像 404 → SafeImage
 * 降级显示首字占位。
 *
 * 此文件主动 import 全 9 张 PNG 并 export 数组（被 main.ts 引入），
 * 强制 vite 收集并复制到 dist。运行时实际仍按 URL 加载，const 仅用于
 * 触发静态资源按引用打包，与 IMAGE_PATHS.PEOPLE 字符串 URL 协同。
 */
import person01 from '/static/assets/images/people/person-01.png';
import person02 from '/static/assets/images/people/person-02.png';
import person03 from '/static/assets/images/people/person-03.png';
import person04 from '/static/assets/images/people/person-04.png';
import person05 from '/static/assets/images/people/person-05.png';
import person06 from '/static/assets/images/people/person-06.png';
import person07 from '/static/assets/images/people/person-07.png';
import person08 from '/static/assets/images/people/person-08.png';
import person09 from '/static/assets/images/people/person-09.png';

export const PERSON_AVATARS: ReadonlyArray<string> = [
  person01, person02, person03, person04, person05,
  person06, person07, person08, person09,
];
