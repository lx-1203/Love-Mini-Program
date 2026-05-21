import { spawn } from "node:child_process";

const warningMatchers = [
  /resolve\.alias.*customResolver/iu,
  /Sass @import rules are deprecated/iu,
];

const builds = [
  { label: "mock build", command: "npm --workspace apps/client run build:h5" },
  { label: "real build", command: "npm --workspace apps/client run build:h5:real" },
];

function runBuild({ label, command }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: process.cwd(),
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
