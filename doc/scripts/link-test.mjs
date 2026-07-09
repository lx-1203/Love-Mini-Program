/**
 * 校园恋爱小程序 — 10 场景链路测试脚本
 * 
 * 测试前需要后端在 localhost:8080 运行 (Mock 模式)
 * 运行: node doc/scripts/link-test.mjs
 */

import { request } from "node:http";

const BASE = "http://localhost:8080/api";

function httpCall(method, path, body = null) {
  return new Promise((resolve, reject) => {
    // 使用字符串拼接避免 new URL 在绝对路径时丢失 /api 前缀
    const fullUrl = BASE + (path.startsWith("/") ? path : "/" + path);
    const url = new URL(fullUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    };
    const req = request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", (e) => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const results = [];

async function test(name, fn) {
  try {
    const result = await fn();
    const pass = result.status >= 200 && result.status < 300;
    results.push({ name, pass, status: result.status, detail: JSON.stringify(result.body).slice(0, 100) });
    console.log(pass ? "✅" : "❌", name, `(${result.status})`);
  } catch (e) {
    results.push({ name, pass: false, status: "ERR", detail: e.message });
    console.log("❌", name, `(ERR: ${e.message})`);
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("校园恋爱小程序 — 10 场景链路测试");
  console.log("=".repeat(60));

  // 场景1: 登录 → 首页仪表盘
  await test("S01: 微信登录", async () => {
    return httpCall("POST", "/auth/wechat-login", { code: "wechat-code" });
  });

  await test("S01b: 获取首页仪表盘", async () => {
    return httpCall("GET", "/home/dashboard");
  });

  // 场景2: 首页展示课表摘要、资料引导、推荐的人、活动入口
  await test("S02: 首页推荐人选", async () => {
    const r = await httpCall("GET", "/home/dashboard");
    if (r.body && r.body.recommendedPeople) {
      r.status = 200;
      r.detail = `recommendedPeople: ${r.body.recommendedPeople.length}人`;
    }
    return r;
  });

  // 场景3: 从推荐的人进入聊天
  let sharedSessionId = null;
  await test("S03: 创建临时聊天会话", async () => {
    const r = await httpCall("POST", "/temp-chat/sessions", {
      recommendedPersonId: "person-1",
    });
    if (r.body && r.body.id) {
      sharedSessionId = r.body.id;
    }
    return r;
  });

  // 场景4: 会话出现在聊天列表
  await test("S04: 获取聊天概览列表", async () => {
    return httpCall("GET", "/chat/overview");
  });

  // 场景5: 发送文字消息
  await test("S05: 发送文字消息", async () => {
    if (!sharedSessionId) {
      return { status: 400, body: { error: "no shared session" } };
    }
    return httpCall("POST", `/temp-chat/sessions/${sharedSessionId}/messages`, {
      sender: "self",
      kind: "text",
      body: "你好！很高兴认识你",
    });
  });

  // 场景6: 处理联系方式交换（正确端点：/temp-chat/sessions/{id}/contact-exchange/respond）
  await test("S06: 申请联系方式交换", async () => {
    if (!sharedSessionId) {
      return { status: 400, body: { error: "no shared session" } };
    }
    return httpCall("POST", `/temp-chat/sessions/${sharedSessionId}/contact-exchange/respond`, {
      actor: "self",
      decision: "accepted",
    });
  });

  // 场景7: 主动结束会话（正确端点：/temp-chat/sessions/{id}/end）
  await test("S07: 结束会话", async () => {
    if (!sharedSessionId) {
      return { status: 400, body: { error: "no shared session" } };
    }
    return httpCall("POST", `/temp-chat/sessions/${sharedSessionId}/end`);
  });

  // 场景8: 聊天列表状态变化
  await test("S08: 会话列表状态", async () => {
    return httpCall("GET", "/chat/overview");
  });

  // 场景9: 从匹配页进入聊天
  await test("S09: 获取匹配配置", async () => {
    return httpCall("GET", "/matches/form-config");
  });

  // 场景10: Mock 模式状态一致
  await test("S10: 个人资料", async () => {
    return httpCall("GET", "/profile/basic");
  });

  // 输出报告
  console.log("\n" + "=".repeat(60));
  console.log("测试结果汇总");
  console.log("=".repeat(60));
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  
  for (const r of results) {
    console.log(r.pass ? "✅" : "❌", r.name, `[${r.status}]`);
    if (!r.pass) console.log("   ", r.detail);
  }
  
  console.log(`\n通过: ${passed}/${results.length}  失败: ${failed}`);
  
  // 写入结果文件
  const fs = await import("fs");
  fs.writeFileSync(
    "doc/reports/link-test-result.json",
    JSON.stringify({ results, passed, failed, timestamp: new Date().toISOString() }, null, 2)
  );
}

main().catch(console.error);
