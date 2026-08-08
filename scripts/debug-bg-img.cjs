const puppeteer = require("puppeteer");
(async () => {
  const token = await (await fetch("http://127.0.0.1:8080/api/v1/auth/phone-login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:process.env.TEST_ADMIN_PHONE ?? "<REDACTED>",password:process.env.TEST_ADMIN_PASSWORD ?? "<REDACTED>"})})).json();
  const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox","--disable-gpu"],defaultViewport:{width:390,height:844,deviceScaleFactor:2}});
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((tk)=>{localStorage.setItem("token",tk);localStorage.setItem("uni-storage-token",tk);localStorage.setItem("campus-love:privacy-authorized","1");},token.token);
  page.on("console", m=>{if(m.type()==="error")console.log("[console.error]",m.text().slice(0,150));});
  page.on("requestfailed", r=>console.log("[reqfail]",r.url().slice(0,90),r.failure()?.errorText));
  await page.goto("http://localhost:5173/#/pages/discover/index",{waitUntil:"networkidle2",timeout:60000});
  await new Promise(r=>setTimeout(r,8000));
  const info = await page.evaluate(()=>{
    const img = document.querySelector(".card__bg");
    return {src: img?.getAttribute("src")?.slice(0,100), complete: img?.complete, naturalWidth: img?.naturalWidth, curSrc: img?.currentSrc?.slice(0,100)};
  });
  console.log("[bg-img]", JSON.stringify(info));
  await browser.close();
})();
