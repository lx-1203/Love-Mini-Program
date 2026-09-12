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
/* 2026-09-12 人格池扩容 9→21（GuestPersona 同步）：person-10 ~ 21 同一摄影
 * 风格体系（以 person-01/05 为锚点链生成），必须 import 才会被 vite 收集，
 * 否则 userId%21 命中 10-21 的体验账号头像 404（SafeImage 降级首字占位）。 */
import person10 from '/static/assets/images/people/person-10.png';
import person11 from '/static/assets/images/people/person-11.png';
import person12 from '/static/assets/images/people/person-12.png';
import person13 from '/static/assets/images/people/person-13.png';
import person14 from '/static/assets/images/people/person-14.png';
import person15 from '/static/assets/images/people/person-15.png';
import person16 from '/static/assets/images/people/person-16.png';
import person17 from '/static/assets/images/people/person-17.png';
import person18 from '/static/assets/images/people/person-18.png';
import person19 from '/static/assets/images/people/person-19.png';
import person20 from '/static/assets/images/people/person-20.png';
import person21 from '/static/assets/images/people/person-21.png';

export const PERSON_AVATARS: ReadonlyArray<string> = [
  person01, person02, person03, person04, person05,
  person06, person07, person08, person09,
  person10, person11, person12, person13, person14,
  person15, person16, person17, person18, person19,
  person20, person21,
];
