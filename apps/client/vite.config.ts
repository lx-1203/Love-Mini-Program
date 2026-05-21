import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

const require = createRequire(import.meta.url);

type UniAliasEntry = Record<string, unknown> & {
  customResolver?: unknown;
};

type UniResolveConfig = {
  alias?: UniAliasEntry[];
  [key: string]: unknown;
};

function patchUniAliasResolverDeprecation() {
  const resolveModule = require("@dcloudio/vite-plugin-uni/dist/config/resolve.js") as {
    createResolve?: (...args: unknown[]) => UniResolveConfig;
    __campusLovePatched?: boolean;
  };

  if (resolveModule.__campusLovePatched || typeof resolveModule.createResolve !== "function") {
    return;
  }

  const originalCreateResolve = resolveModule.createResolve;

  resolveModule.createResolve = (...args: unknown[]) => {
    const resolved = originalCreateResolve(...args);

    if (!Array.isArray(resolved.alias)) {
      return resolved;
    }

    return {
      ...resolved,
      alias: resolved.alias.map((entry) => {
        if (!entry || typeof entry !== "object" || !("customResolver" in entry)) {
          return entry;
        }

        const { customResolver: _customResolver, ...rest } = entry;
        return rest;
      }),
    };
  };

  resolveModule.__campusLovePatched = true;
}

patchUniAliasResolverDeprecation();

export default defineConfig({
  resolve: {
    alias: {
      vue: fileURLToPath(
        new URL("../../node_modules/@dcloudio/uni-h5-vue/dist/vue.runtime.esm.js", import.meta.url)
      ),
    },
  },
  plugins: [uni.default()],
});
