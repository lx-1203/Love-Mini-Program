// 定位未闭合的 view:逐行维护深度,输出每个 <view> 开始标签位置与最深闭合缺口
const fs = require("fs");
const content = fs.readFileSync("apps/client/src/pages/login/index.vue", "utf8");
const lines = content.split("\n");
let depth = 0;
let inTemplate = false;
let inScript = false;
const opens = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("<template>")) inTemplate = true;
  if (line.includes("</template>")) inTemplate = false;
  if (inTemplate) {
    // 粗略统计(忽略字符串内的尖括号,用于定位)
    const openCount = (line.match(/<view[\s>]/g) || []).length;
    const closeCount = (line.match(/<\/view>/g) || []).length;
    for (let k = 0; k < openCount; k++) opens.push({ line: i + 1, depth });
    depth += openCount - closeCount;
    if (openCount > 0 || closeCount > 0) {
      console.log(`L${i + 1}: open=${openCount} close=${closeCount} depth=${depth}`);
    }
  }
}
console.log("FINAL DEPTH:", depth, "(应为 0)");
console.log("最近未闭合的 open:", opens.slice(-8));
