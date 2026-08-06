// 验证 YAML 配置文件语法(delivery 模式下的常规校验器)
const fs = require("fs");
const YAML = require("yaml");
const files = [
  "docker-compose.yml",
  "docker/prometheus/prometheus.yml",
  "docker/alertmanager/alertmanager.yml",
  "docker/prometheus/rules/alert-rules.yml",
  "docker/grafana/provisioning/datasources/datasources.yml",
  "docker/grafana/provisioning/dashboards/dashboards.yml",
  ".github/workflows/ci.yml",
];
let ok = true;
for (const f of files) {
  try {
    YAML.parse(fs.readFileSync(f, "utf8"));
    console.log(`OK: ${f}`);
  } catch (e) {
    ok = false;
    console.log(`ERROR: ${f}: ${e.message}`);
  }
}
process.exit(ok ? 0 : 1);
