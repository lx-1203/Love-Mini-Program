const { spawn } = require("node:child_process");
const { resolve } = require("node:path");

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node tools/run-api-wrapper.cjs <maven-args...>");
  process.exit(1);
}

const apiDir = resolve(__dirname, "..", "apps", "api");
const isWindows = process.platform === "win32";
const command = isWindows ? "cmd.exe" : resolve(apiDir, "mvnw");
const commandArgs = isWindows
  ? ["/d", "/s", "/c", resolve(apiDir, "mvnw.cmd"), ...args]
  : args;

const child = spawn(command, commandArgs, {
  cwd: apiDir,
  stdio: "inherit",
  shell: false,
  windowsHide: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
