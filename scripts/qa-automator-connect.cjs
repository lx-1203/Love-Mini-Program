/* QA 自动化：连接微信开发者工具，触发真实编译，验证编译结果 */
const automator = require("D:/6/恋爱小程序/apps/client/node_modules/miniprogram-automator");

async function main() {
  const miniProgram = await automator.connect({
    wsEndpoint: "ws://127.0.0.1:9420",
  });
  console.log("[connected] 已连接自动化服务");

  try {
    // launch 触发真实编译
    const res = await miniProgram.launch();
    console.log("[launch] 编译启动返回:", res ? JSON.stringify(res) : "ok");
    // 等待编译完成
    await new Promise((r) => setTimeout(r, 8000));

    const systemInfo = await miniProgram.systemInfo();
    console.log("[systemInfo]", JSON.stringify(systemInfo).slice(0, 300));

    const currentPage = await miniProgram.currentPage();
    console.log("[currentPage]", currentPage ? currentPage.path : "无");
  } catch (e) {
    console.error("[launch-error]", e && e.message ? e.message : e);
  } finally {
    try { await miniProgram.disconnect(); } catch (e) {}
  }
}

main().catch((e) => {
  console.error("[fatal]", e && e.message ? e.message : e);
  process.exit(1);
});
