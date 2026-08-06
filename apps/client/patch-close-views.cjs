// 在 </template> 前补 6 个 </view> 使模板平衡
const fs = require("fs");
const path = "apps/client/src/pages/login/index.vue";
let content = fs.readFileSync(path, "utf8");
const marker = "</template>";
const idx = content.lastIndexOf(marker);
if (idx < 0) { console.error("template end not found"); process.exit(1); }
const insertion = "</view>\n</view>\n</view>\n</view>\n</view>\n</view>\n";
content = content.slice(0, idx) + insertion + content.slice(idx);
fs.writeFileSync(path, content, "utf8");
console.log("6 closing views added before </template>");
