const puppeteer = require("puppeteer");
(async () => {
  const token = await (await fetch("http://127.0.0.1:8080/api/v1/auth/phone-login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:process.env.TEST_ADMIN_PHONE ?? "<REDACTED>",password:process.env.TEST_ADMIN_PASSWORD ?? "<REDACTED>"})})).json();
  const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox","--disable-gpu"],defaultViewport:{width:390,height:844,deviceScaleFactor:1}});
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((tk)=>{localStorage.setItem("token",tk);localStorage.setItem("uni-storage-token",tk);localStorage.setItem("campus-love:privacy-authorized","1");},token.token);
  await page.goto("http://localhost:5173/#/pages/discover/index",{waitUntil:"networkidle2",timeout:60000});
  await page.waitForSelector(".card--current",{timeout:30000});
  await new Promise(r=>setTimeout(r,6000));
  // 采样卡片中上部（背景大图区域，避开文字蒙层）几个像素点
  const colors = await page.evaluate(()=>{
    const card = document.querySelector(".card--current").getBoundingClientRect();
    const pts = [[0.2,0.25],[0.5,0.25],[0.8,0.3],[0.5,0.5]];
    return pts.map(([fx,fy])=>({x:Math.round(card.left+card.width*fx), y:Math.round(card.top+card.height*fy)}));
  });
  // 通过 screenshot clip + png 解析需要库，直接检查元素渲染：
  const img = await page.evaluate(()=>{
    const uni = document.querySelectorAll(".card__bg")[1];
    const i = uni?.querySelector("img");
    return {complete: i?.complete, nw: i?.naturalWidth, nh: i?.naturalHeight, src: (i?.getAttribute("src")||"").slice(0,80)};
  });
  console.log("[bg-img-real]", JSON.stringify(img));
  console.log("[sample-points]", JSON.stringify(colors));
  // 截图整页
  await page.screenshot({path:"test-screenshots/verify-card-final.png", fullPage:false});
  console.log("[shot saved]");
  await browser.close();
})();
