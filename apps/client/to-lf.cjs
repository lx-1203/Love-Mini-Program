// 统一行尾为 LF 再应用补丁
const fs = require("fs");
const path = "apps/client/src/pages/login/index.vue";
let content = fs.readFileSync(path, "utf8");
content = content.replace(/\r\n/g, "\n");
fs.writeFileSync(path, content, "utf8");
console.log("converted to LF");
