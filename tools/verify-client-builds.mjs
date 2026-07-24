import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const warningMatchers = [
  /resolve\.alias.*customResolver/iu,
];

/**
 * 判断当前环境是否能正常使用 pnpm。
 * 某些本地 Windows 环境会因目录锁导致 pnpm 注册 project symlink 失败（EBUSY），
 * 此时回退到直接调用 apps/client/node_modules/.bin 下的命令。
 * 使用 dry-run 安装探测，能覆盖 --version 正常但 workspace 命令触发 install 的场景。
 * @returns {Promise<boolean>}
 */
function canUsePnpm() {
  return new Promise((resolve) => {
    const child = spawn("pnpm install --frozen-lockfile --dry-run", {
      cwd: process.cwd(),
      env: process.env,
      shell: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

const usePnpm = await canUsePnpm();
const clientDir = "apps/client";

const builds = usePnpm
  ? [
      { label: "mock build", command: "pnpm --filter @campus-love/client run build:h5" },
      { label: "real build", command: "pnpm --filter @campus-love/client run build:h5:real" },
      { label: "mp-weixin build", command: "pnpm --filter @campus-love/client run build:mp-weixin" },
    ]
  : [
      { label: "mock build", command: `"node_modules/.bin/uni.CMD" build --platform h5` },
      { label: "real build", command: `"node_modules/.bin/uni.CMD" build --platform h5 --mode real` },
      { label: "mp-weixin build", command: `"node_modules/.bin/uni.CMD" build --platform mp-weixin` },
    ];

/**
 * 执行一次构建命令并检查异常警告。
 * @param {{ label: string; command: string }} build
 * @returns {Promise<void>}
 */
function runBuild({ label, command }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: usePnpm ? process.cwd() : clientDir,
      env: process.env,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let combinedOutput = "";

    const onData = (chunk, writer) => {
      const text = chunk.toString();
      combinedOutput += text;
      writer.write(text);
    };

    child.stdout.on("data", (chunk) => onData(chunk, process.stdout));
    child.stderr.on("data", (chunk) => onData(chunk, process.stderr));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${label} failed with exit code ${code ?? "unknown"}`));
        return;
      }

      const matchedWarning = warningMatchers.find((pattern) => pattern.test(combinedOutput));

      if (matchedWarning) {
        reject(new Error(`${label} emitted a blocked warning: ${matchedWarning}`));
        return;
      }

      resolve();
    });
  });
}

for (const build of builds) {
  await runBuild(build);
}

// 校验微信小程序产物关键入口文件存在
const mpWeixinAppJsonPath = "apps/client/dist/build/mp-weixin/app.json";
if (!existsSync(mpWeixinAppJsonPath)) {
  throw new Error(`mp-weixin build artifact missing: ${mpWeixinAppJsonPath}`);
}

console.log("all client builds passed");
