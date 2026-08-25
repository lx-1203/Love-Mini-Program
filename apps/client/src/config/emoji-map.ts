/**
 * EmojiPanel / ChatBubble 表情替换映射表（2026-08-26 第三轮 emoji→SVG）
 *
 * 设计：
 * - 32 个聊天面板 emoji 字符 → 标准 SVG 路径（绝对路径，mp-weixin `<image>` 可直接使用）
 * - 7 个品牌吉祥物情绪表情（calm/crush/cry/hug/like/shy/sleep）来自 `素材/吉祥物/xunmi_mascot_assets/emotion/`
 * - 25 个标准笑脸 / 手势表情来自 Twemoji 14.0.2（CC-BY 4.0，标准 emoji 视觉）
 * - keys 为 FE0F-stripped 的逻辑字符（"❤" 而非 "❤️"）；lookupEmoji 自动剥离 FE0F，
 *   保证 EmojiPanel 发出"❤️"、ChatBubble body 收到"❤️"、历史消息/后端字符串中的 ❤️ 都能命中。
 *
 * 数据格式兼容：emoji 字符本身不变（仍是 Unicode），仅渲染层用 SVG 替换，
 * 任何依赖 emoji 字符做匹配的业务逻辑不受影响。
 */

/** emoji 静态资源基础路径（与 config/images.ts 的 STATIC_BASE 一致） */
const EMOJI_BASE = '/static/assets/icons/emoji';

/** Twemoji（标准笑脸/手势）→ 本地 SVG 文件名 */
const TWEMOJI: Record<string, string> = {
  '\u{1F600}': '1f600.svg',  // 😀 grinning face
  '\u{1F601}': '1f601.svg',  // 😁 beaming face
  '\u{1F602}': '1f602.svg',  // 😂 face with tears of joy
  '\u{1F923}': '1f923.svg',  // 🤣 rolling on the floor laughing
  '\u{1F970}': '1f970.svg',  // 🥰 smiling face with hearts
  '\u{1F618}': '1f618.svg',  // 😘 face blowing a kiss
  '\u{1F60E}': '1f60e.svg',  // 😎 smiling face with sunglasses
  '\u{1F929}': '1f929.svg',  // 🤩 star-struck
  '\u{1F973}': '1f973.svg',  // 🥳 partying face
  '\u{1F60B}': '1f60b.svg',  // 😋 face savoring food
  '\u{1F61C}': '1f61c.svg',  // 😜 face with tongue
  '\u{1F914}': '1f914.svg',  // 🤔 thinking face
  '\u{1F624}': '1f624.svg',  // 😤 face with steam from nose
  '\u{1F621}': '1f621.svg',  // 😡 pouting face
  '\u{1F607}': '1f607.svg',  // 😇 smiling face with halo
  '\u{1F971}': '1f971.svg',  // 🥱 yawning face
  '\u{1F91D}': '1f91d.svg',  // 🤝 handshake
  '\u{1F44E}': '1f44e.svg',  // 👎 thumbs down
  '\u{1F44F}': '1f44f.svg',  // 👏 clapping hands
  '\u{1F64F}': '1f64f.svg',  // 🙏 folded hands
  '\u{1F4AA}': '1f4aa.svg',  // 💪 flexed biceps
  '\u2764':    '2764-fe0f.svg', // ❤ heavy black heart（FE0F-stripped）
  '\u{1F494}': '1f494.svg',  // 💔 broken heart
  '\u2728':    '2728.svg',   // ✨ sparkles
  '\u{1F389}': '1f389.svg',  // 🎉 party popper
};

/** 寻觅品牌吉祥物情绪表情（7 个，FE0F-stripped key） */
const MASCOT: Record<string, string> = {
  '\u{1F60A}': 'mascot_calm.svg',   // 😊 → mascot_calm 平静微笑
  '\u{1F60D}': 'mascot_crush.svg',  // 😍 → mascot_crush 心动
  '\u{1F97A}': 'mascot_shy.svg',    // 🥺 → mascot_shy 害羞
  '\u{1F62D}': 'mascot_cry.svg',    // 😭 → mascot_cry 哭泣
  '\u{1F917}': 'mascot_hug.svg',    // 🤗 → mascot_hug 拥抱
  '\u{1F634}': 'mascot_sleep.svg',  // 😴 → mascot_sleep 睡觉
  '\u{1F44D}': 'mascot_like.svg',   // 👍 → mascot_like 点赞/喜欢
};

/** 完整 emoji → SVG 路径映射（7 mascot + 25 twemoji = 32 项） */
export const EMOJI_SVG_MAP: Record<string, string> = {
  ...MASCOT,
  ...TWEMOJI,
};

/** 移除 U+FE0F 变体选择符，得到"逻辑"emoji 字符 */
function stripVS(s: string): string {
  // mp-weixin / iOS / Android 都会在 emoji 后追加 \uFE0F 以触发彩色字体；
  // 映射表使用 FE0F-stripped key，所以查询前需要先去除。
  return s.replace(/\uFE0F/g, '');
}

/**
 * 查询某个 emoji 字符对应的 SVG 路径。
 * 返回 null 表示该字符不在映射表中（应保留为系统字符渲染）。
 */
export function lookupEmoji(emoji: string): string | null {
  const key = stripVS(emoji);
  const file = EMOJI_SVG_MAP[key];
  return file ? `${EMOJI_BASE}/${file}` : null;
}

/**
 * 判断某字符串是否包含至少一个可映射 emoji。
 * 供 EmojiText 决定走"分段渲染"还是"纯文本"。
 */
export function containsEmoji(text: string): boolean {
  if (!text) return false;
  const norm = stripVS(text);
  // 用 keys 做存在性检查（避免为每条字符串重新构造正则）
  for (const k of Object.keys(EMOJI_SVG_MAP)) {
    if (norm.indexOf(k) >= 0) return true;
  }
  return false;
}

/**
 * 构造用于切分"emoji 段/文本段"的正则。
 * keys 按长度倒序排列，避免短前缀先匹配吃掉长 emoji。
 * 模式形如 `(\u{1F62D}\uFE0F?|\u{1F60A}\uFE0F?|...)`，
 * 匹配时会连同可选的 FE0F 一起吃掉，文本段就不会残留隐形变体符。
 */
let _splitRegex: RegExp | null = null;
function buildSplitRegex(): RegExp {
  if (_splitRegex) return _splitRegex;
  const keys = Object.keys(EMOJI_SVG_MAP).sort((a, b) => b.length - a.length);
  // 逐字符构造 char class union（emoji 都是 1 个 BMP 平面码点或 surrogate pair）
  const escaped = keys.map((k) => {
    // 转义 surrogate pair：用 \u{XXXX} 形式更通用
    const cp = k.codePointAt(0)!;
    return `\\u{${cp.toString(16)}}`;
  });
  // emoji 后可跟 \uFE0F
  _splitRegex = new RegExp(`(${escaped.join('|')})\uFE0F?`, 'gu');
  return _splitRegex;
}

/**
 * 把字符串切分成"文本段 / emoji 段"数组，供 EmojiText.vue 渲染。
 * 每段结构：{ type: 'text' | 'emoji', value: string, src?: string }
 * - emoji 段：value 是原始 emoji 字符（可能含 FE0F），src 是 SVG 绝对路径
 * - 文本段：value 是不含任何已知 emoji 的纯文本
 */
export interface EmojiSegment {
  type: 'text' | 'emoji';
  value: string;
  src?: string;
}

export function splitEmojiText(text: string): EmojiSegment[] {
  if (!text) return [];
  const re = buildSplitRegex();
  const segments: EmojiSegment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  // 重置 lastIndex（g flag）
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    }
    const raw = m[0];
    segments.push({ type: 'emoji', value: raw, src: lookupEmoji(raw) || undefined });
    lastIndex = re.lastIndex;
    if (m[0].length === 0) re.lastIndex++; // 防御性
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return segments;
}