/** ③ 客户端半段的非帧级载具：上传扩展名闸门 + 私信引用快照解析。
 *
 * 为什么用单测而不是截图 —— 台账 `MP-R7CLIENT-UPLOAD-EXT-001` 那条的"页面"是一组共享模块文件，
 * 页级巡演根本开不到它（补拍清单把它算成 `不在巡检全集内=1` 明写了）。
 * 判"一个纯函数拒不拒"该用能直接调它的载具，截图在这里既贵又判不到负例。
 */
import { describe, expect, it } from "vitest";
import {
  ALLOWED_MEDIA_EXTS,
  describeAllowedMediaExts,
  getMediaFileExt,
  isAllowedMediaExt,
} from "../utils/media";
import { parsePrivateQuoteContext } from "../stores/messages";

describe("上传扩展名白名单（客户端唯一真源）", () => {
  it("三档白名单与后端 LocalMediaStorageService 同集合", () => {
    expect([...ALLOWED_MEDIA_EXTS.image]).toEqual(["jpg", "jpeg", "png", "webp"]);
    expect([...ALLOWED_MEDIA_EXTS.video]).toEqual(["mp4", "mov"]);
    expect([...ALLOWED_MEDIA_EXTS.audio]).toEqual(["aac", "mp3", "m4a", "wav"]);
  });

  it("后端拒收的格式必须在发起上传前就被拒（gif 是历史踩点：limits.ts 那份旧清单放行它）", () => {
    expect(isAllowedMediaExt("wxfile://tmp/face.gif", "image")).toBe(false);
    expect(isAllowedMediaExt("/tmp/clip.webm", "video")).toBe(false);
    expect(isAllowedMediaExt("http://tmp/x.svg", "image")).toBe(false);
    expect(isAllowedMediaExt("note.txt", "image")).toBe(false);
  });

  it("合法扩展名放行且大小写不敏感", () => {
    expect(isAllowedMediaExt("wxfile://tmp/a.PNG", "image")).toBe(true);
    expect(isAllowedMediaExt("http://tmp/b.JPEG?w=100", "image")).toBe(true);
    expect(isAllowedMediaExt("/tmp/voice.MP3", "audio")).toBe(true);
  });

  it("取不到扩展名时保守放行，把判定交回服务端（H5 blob: 不能误杀）", () => {
    expect(isAllowedMediaExt("blob:http://localhost/8f21", "image")).toBe(true);
    expect(isAllowedMediaExt("", "image")).toBe(true);
    expect(isAllowedMediaExt(null, "audio")).toBe(true);
    expect(getMediaFileExt("blob:http://localhost/8f21")).toBe("");
    expect(getMediaFileExt("http://tmp/a.jpeg?x=1#frag")).toBe("jpeg");
    expect(getMediaFileExt("C:\\tmp\\photo.webp")).toBe("webp");
  });

  it("错误文案里的可读清单来自同一张表，不再手写第二份", () => {
    expect(describeAllowedMediaExts("image")).toBe("jpg / jpeg / png / webp");
  });
});

describe("私信 quoteContext 解析（后端 sender 是用户 ID，与临时会话口径不同）", () => {
  it("数字 sender 命中当前用户 ⇒ self，不命中 ⇒ peer", () => {
    const mine = JSON.stringify({ id: 771, body: "原文", sender: 100158 });
    expect(parsePrivateQuoteContext(mine, "100158")).toEqual({ quoteRef: "771", quoteBody: "原文", quoteSender: "self" });
    const theirs = JSON.stringify({ id: "772", body: "别人的", sender: 100159 });
    expect(parsePrivateQuoteContext(theirs, "100158")).toEqual({ quoteRef: "772", quoteBody: "别人的", quoteSender: "peer" });
  });

  it("已经是 self/peer/system 字面量时按原义走，system 不会被降级成 peer", () => {
    expect(parsePrivateQuoteContext(JSON.stringify({ id: 1, body: "b", sender: "system" }), "100158"))
      .toEqual({ quoteRef: "1", quoteBody: "b", quoteSender: "system" });
  });

  it("无引用、非 JSON 脏数据、缺 id 三种情形都判成没有引用（消息按普通气泡渲染）", () => {
    expect(parsePrivateQuoteContext(null, "100158")).toBeNull();
    expect(parsePrivateQuoteContext("   ", "100158")).toBeNull();
    expect(parsePrivateQuoteContext("{不是 JSON", "100158")).toBeNull();
    expect(parsePrivateQuoteContext(JSON.stringify({ body: "无 id" }), "100158")).toBeNull();
  });

  it("currentUserId 还没就绪时不误判成 self（R16 那类翻转的根因之一）", () => {
    expect(parsePrivateQuoteContext(JSON.stringify({ id: 5, body: "b", sender: 100158 }), ""))
      .toEqual({ quoteRef: "5", quoteBody: "b", quoteSender: "peer" });
  });
});
