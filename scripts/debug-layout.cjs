const puppeteer = require("puppeteer");
(async () => {
  const token = await (await fetch("http://127.0.0.1:8080/api/v1/auth/phone-login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:process.env.TEST_ADMIN_PHONE ?? "<REDACTED>",password:process.env.TEST_ADMIN_PASSWORD ?? "<REDACTED>"})})).json();
  const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox","--disable-gpu"],defaultViewport:{width:390,height:844,deviceScaleFactor:1}});
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((tk)=>{localStorage.setItem("token",tk);localStorage.setItem("uni-storage-token",tk);localStorage.setItem("campus-love:privacy-authorized","1");},token.token);
  await page.goto("http://localhost:5173/#/pages/discover/index",{waitUntil:"networkidle2",timeout:60000});
  await page.waitForSelector(".card--current",{timeout:30000});
  await new Promise(r=>setTimeout(r,6000));
  const info = await page.evaluate(()=>{
    const rect = (el)=>{const r=el.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),Math.round(r.top)]};
    const card = document.querySelector(".card--current");
    const next = document.querySelector(".card--next");
    const bgs = Array.from(document.querySelectorAll(".card__bg"));
    const overlay = document.querySelector(".card__overlay");
    return {
      card: rect(card), next: rect(next),
      bgs: bgs.map(b=>{const i=b.querySelector("img");return {cls:b.className.slice(0,40),rect:rect(b),imgNW:i?.naturalWidth,imgRect:i?rect(i):null};}),
      overlay: rect(overlay),
    };
  });
  console.log(JSON.stringify(info,null,1));
  await browser.close();
})();
