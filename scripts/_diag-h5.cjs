const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = "D:\\6\\恋爱小程序\\apps\\client\\dist\\build\\h5";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const fp = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  });
});
(async () => {
  await new Promise((r) => server.listen(8711, "127.0.0.1", r));
  const token = await new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: 8080, path: "/api/v1/auth/guest-login", method: "POST", headers: { "Content-Type": "application/json" } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => { try { resolve(JSON.parse(body).token); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    req.end("{}");
  });
  const puppeteer = require("D:/6/恋爱小程序/node_modules/puppeteer");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((tk) => {
    localStorage.setItem("token", tk);
    localStorage.setItem("uni-storage-token", tk);
  }, token);
  await page.goto("http://127.0.0.1:8711/#/pages/discover/index", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 6000));
  // 点击位置元素
  const el = await page.evaluate(() => {
    const e = document.elementFromPoint(195, 400);
    return e ? e.tagName + "." + (e.className || "").toString().slice(0, 80) : null;
  });
  console.log("element at (195,400):", el);
  // touch tap
  await page.touchscreen.tap(195, 400);
  await new Promise((r) => setTimeout(r, 2000));
  const overlay = await page.evaluate(() => {
    const o = document.querySelector(".card-detail-overlay");
    return o ? { exists: true, text: (o.innerText || "").slice(0, 200) } : { exists: false };
  });
  console.log("overlay:", JSON.stringify(overlay));
  await browser.close();
  server.close();
})();
