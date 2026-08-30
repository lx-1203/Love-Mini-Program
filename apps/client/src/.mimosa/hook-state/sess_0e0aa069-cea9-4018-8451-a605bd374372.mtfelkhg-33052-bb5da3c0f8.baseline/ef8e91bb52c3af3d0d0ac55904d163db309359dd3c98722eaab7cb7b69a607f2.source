import { renderToString } from "@vue/server-renderer";
import {
  UNI_SSR,
  UNI_SSR_DATA,
  UNI_SSR_GLOBAL_DATA,
  UNI_SSR_STORE,
  UNI_SSR_TITLE,
} from "@dcloudio/uni-shared";

export async function render(url, manifest = {}) {
  if (typeof globalThis.navigator === "undefined") {
    globalThis.navigator = { vendor: "" };
  }

  const [{ createApp }, { plugin }, { getSsrGlobalData }] = await Promise.all([
    import("./main"),
    import("@dcloudio/uni-h5"),
    import("@dcloudio/uni-app"),
  ]);

  const { app, pinia } = createApp();
  app.use(plugin);

  const router = app.router;

  await router.push(url);
  await router.isReady();

  const ctx = {};
  const appHtml = await renderToString(app, ctx);
  const preloadLinks = renderPreloadLinks(ctx.modules, manifest);
  const uniSsr = ctx[UNI_SSR] || (ctx[UNI_SSR] = {});

  if (!uniSsr[UNI_SSR_DATA]) {
    uniSsr[UNI_SSR_DATA] = {};
  }

  uniSsr[UNI_SSR_GLOBAL_DATA] = getSsrGlobalData();

  if (pinia) {
    uniSsr[UNI_SSR_STORE] = pinia.state.value;
  }

  return {
    title: ctx[UNI_SSR_TITLE] || "",
    headMeta: renderHeadMeta(ctx),
    preloadLinks,
    appHtml,
    appContext: `<script>window.__uniSSR = ${JSON.stringify(uniSsr)}</script>`,
  };
}

function renderPreloadLinks(modules, manifest) {
  if (!modules) {
    return "";
  }

  let links = "";
  const seen = new Set();

  modules.forEach((id) => {
    const files = manifest[id];

    if (!files) {
      return;
    }

    files.forEach((file) => {
      if (seen.has(file)) {
        return;
      }

      seen.add(file);
      links += renderPreloadLink(file);
    });
  });

  return links;
}

function renderPreloadLink(file) {
  if (file.endsWith(".js")) {
    return `<link rel="modulepreload" crossorigin href="${file}">`;
  }

  if (file.endsWith(".css")) {
    return `<link rel="stylesheet" href="${file}">`;
  }

  return "";
}

function renderHeadMeta(ctx) {
  if (!ctx.__teleportBuffers || !ctx.__teleportBuffers.head) {
    return "";
  }

  return ctx.__teleportBuffers.head
    .map((buffer) =>
      buffer
        .toString()
        .replace(/\s+data-v-[a-f0-9]{8}/gi, "")
        .replace("<!--[-->", "")
        .replace("<!--]--><!---->", "")
    )
    .join("\n");
}
