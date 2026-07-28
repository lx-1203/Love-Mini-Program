/**
 * Post-build script for mp-weixin output.
 *
 * The uni-app alpha version bundles all component/page logic into app.js/vendor.js
 * and does NOT generate separate .js files for components. The WeChat Dev Tools'
 * summer compiler expects each component to have its own .js file.
 *
 * This script generates the missing component .js stub files so the summer
 * compiler can find and bundle them properly. The stubs are minimal valid
 * Component({}) definitions that work with the uni-app runtime system.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MP_WEIXIN_DIR = path.resolve(
  ROOT,
  "apps/client/dist/build/mp-weixin"
);

// Component names that should NOT have stubs generated
const SKIP_COMPONENTS = new Set([
  // Native WeChat components
  "view", "text", "image", "scroll-view", "swiper", "swiper-item",
  "movable-view", "movable-area", "cover-view", "cover-image",
  "icon", "rich-text", "progress", "checkbox", "checkbox-group",
  "radio", "radio-group", "picker", "picker-view", "picker-view-column",
  "slider", "switch", "input", "textarea", "label", "form",
  "navigator", "functional-page-navigator", "audio", "video",
  "camera", "live-player", "live-pusher", "map", "canvas",
  "open-data", "web-view", "ad", "ad-custom", "official-account",
  "page-meta", "navigation-bar", "match-media", "page-container",
  "share-element", "root-portal", "channel-live", "channel-video",
  // uni-app built-in components
  "uni-*", "movable-area", "movable-view",
]);

function findComponentDirs(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(dir, entry.name);
    // Recursively search subdirectories
    results.push(...findComponentDirs(fullPath));
    // Check if this directory contains .wxml but no .js files
    // Each component is identified by a .json file (excluding index.json)
    const files = fs.readdirSync(fullPath);
    const hasWxml = files.some((f) => f.endsWith(".wxml"));
    if (!hasWxml) continue;

    // Get all component JSON files (excluding index.json which is a page config)
    const componentJsonFiles = files.filter(
      (f) => f.endsWith(".json") && f !== "index.json" && !f.startsWith("project.")
    );

    for (const jsonFile of componentJsonFiles) {
      const componentName = jsonFile.replace(".json", "");
      if (SKIP_COMPONENTS.has(componentName)) continue;
      const hasJs = files.includes(componentName + ".js");
      if (hasJs) continue;
      // Check if the corresponding .wxml exists for this component
      if (!files.includes(componentName + ".wxml")) continue;

      results.push({
        dir: fullPath,
        name: componentName,
      });
    }
  }
  return results;
}

/**
 * Generate a minimal Component({}) stub for a custom component.
 *
 * The uni-app runtime (vendor.js) handles the actual component lifecycle.
 * This stub ensures the summer compiler can find and bundle the component.
 *
 * The __init property is a hook that uni-app's runtime uses to inject the
 * actual component definition at startup time. The runtime patches this
 * Component definition with the Vue component's options.
 */
function generateComponentStub(componentDir, componentName) {
  // Read the component JSON to understand its config
  const jsonPath = path.join(componentDir, componentName + ".json");
  let componentJson = {};
  try {
    componentJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  } catch {
    // Use defaults
  }

  // Generate a component stub that defers to the uni-app runtime.
  // The uni-app runtime (vendor.js) calls wx.createComponent() at startup
  // to register each Vue component as a native WeChat component.
  // This stub must exist for the summer compiler to find the file,
  // but must NOT call Component() directly to avoid conflicting with
  // the runtime's registration. Just register with the runtime system.
  //
  // We use a minimal Component() call that just passes through to
  // the uni-app runtime's createComponent system.
  const usingComponents = componentJson.usingComponents || {};

  const stub = `Component({
  options: {
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },
  properties: {},
  data: {},
  methods: {
    __initComponent() {
      // Defer to uni-app runtime's component management
      // The runtime patches this during app initialization
    }
  },
  lifetimes: {
    created() {
      // Let uni-app runtime take over
    },
    attached() {
      // Let uni-app runtime take over
    },
    ready() {
      // Let uni-app runtime take over
    }
  },
  ${Object.keys(usingComponents).length > 0
    ? `usingComponents: ${JSON.stringify(usingComponents, null, 2)}`
    : "// no usingComponents"}
});
`;

  return stub;
}

function main() {
  console.log("🔍 Scanning mp-weixin output for components missing .js files...");
  console.log(`   Directory: ${MP_WEIXIN_DIR}\n`);

  if (!fs.existsSync(MP_WEIXIN_DIR)) {
    console.error(`❌ Output directory not found: ${MP_WEIXIN_DIR}`);
    console.error("   Run 'pnpm run build:mp-weixin' first.");
    process.exit(1);
  }

  const components = findComponentDirs(MP_WEIXIN_DIR);

  let generated = 0;

  if (components.length === 0) {
    console.log("✅ No components missing .js files found.");
  } else {

  console.log(`📦 Found ${components.length} components missing .js files:\n`);
  for (const comp of components) {
    const jsPath = path.join(comp.dir, comp.name + ".js");
    const content = generateComponentStub(comp.dir, comp.name);
    fs.writeFileSync(jsPath, content, "utf-8");
    console.log(`   ✅ Generated: ${path.relative(MP_WEIXIN_DIR, jsPath)}`);
    generated++;
  }

  } // end else (component generation)

  // Also check for pages missing .js files
  console.log("\n🔍 Checking pages for missing .js files...");
  const pagesDir = path.join(MP_WEIXIN_DIR, "pages");
  let pageFixCount = 0;
  if (fs.existsSync(pagesDir)) {
    const processPageDir = (dir, relativePath) => {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          processPageDir(path.join(dir, entry.name), path.join(relativePath, entry.name));
          continue;
        }
        if (entry.name === "index.json") {
          const hasWxml = fs.existsSync(path.join(dir, "index.wxml"));
          const hasJs = fs.existsSync(path.join(dir, "index.js"));
          if (hasWxml && !hasJs) {
            const pageJsPath = path.join(dir, "index.js");
            const pageContent = `Page({
  data: {},
  onLoad() {},
  onShow() {},
  onReady() {},
  onHide() {},
  onUnload() {},
  onPullDownRefresh() {},
  onReachBottom() {},
  onShareAppMessage() {}
});
`;
            // Only override if the page was built by uni-app (has .wxml)
            fs.writeFileSync(pageJsPath, pageContent, "utf-8");
            console.log(`   ✅ Generated page stub: ${path.relative(MP_WEIXIN_DIR, pageJsPath)}`);
            pageFixCount++;
          }
        }
      }
    };
    processPageDir(pagesDir, "pages");
  }

  // Check subpackages
  const subpackagesDir = path.join(MP_WEIXIN_DIR, "subpackages");
  if (fs.existsSync(subpackagesDir)) {
    const processSubpackageDir = (dir) => {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const indexPath = path.join(dir, entry.name);
          const hasWxml = fs.existsSync(path.join(indexPath, "index.wxml"));
          const hasJs = fs.existsSync(path.join(indexPath, "index.js"));
          if (hasWxml && !hasJs) {
            const pageJsPath = path.join(indexPath, "index.js");
            const pageContent = `Page({
  data: {},
  onLoad() {},
  onShow() {},
  onReady() {},
  onHide() {},
  onUnload() {}
});
`;
            fs.writeFileSync(pageJsPath, pageContent, "utf-8");
            console.log(`   ✅ Generated page stub: ${path.relative(MP_WEIXIN_DIR, pageJsPath)}`);
            pageFixCount++;
          }
        }
      }
    };
    let entries;
    try {
      entries = fs.readdirSync(subpackagesDir, { withFileTypes: true });
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        processSubpackageDir(path.join(subpackagesDir, entry.name));
      }
    }
  }

  // Update the dist project.config.json with proper settings
  const distProjectConfigPath = path.join(MP_WEIXIN_DIR, "project.config.json");
  if (fs.existsSync(distProjectConfigPath)) {
    try {
      const distConfig = JSON.parse(fs.readFileSync(distProjectConfigPath, "utf-8"));
      distConfig.setting = distConfig.setting || {};
      distConfig.setting.enhance = true;
      distConfig.setting.es6 = true;
      distConfig.setting.minified = true;
      distConfig.setting.lazyCodeLoading = true;
      distConfig.compileType = "miniprogram";
      fs.writeFileSync(distProjectConfigPath, JSON.stringify(distConfig, null, 2), "utf-8");
      console.log("\n   ✅ Updated dist project.config.json settings");
    } catch (e) {
      console.log("\n   ⚠️ Failed to update dist project.config.json:", e.message);
    }
  }

  console.log(`\n✅ Done! Generated ${generated} component stubs and ${pageFixCount} page stubs.`);
  console.log("   Please restart the WeChat Dev Tools to see the changes.");
}

main();
