const puppeteer = require("puppeteer");
(async () => {
  const token = await (await fetch("http://127.0.0.1:8080/api/v1/auth/phone-login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"19900000000",password:"Admin@12345"})})).json();
  const browser = await puppeteer.launch({headless:"new",args:["--no-sandbox","--disable-gpu"],defaultViewport:{width:390,height:844,deviceScaleFactor:1}});
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((tk)=>{localStorage.setItem("token",tk);localStorage.setItem("uni-storage-token",tk);localStorage.setItem("campus-love:privacy-authorized","1");},token.token);
  await page.goto("http://localhost:5173/#/pages/discover/index",{waitUntil:"networkidle2",timeout:60000});
  await page.waitForSelector(".card--current",{timeout:30000});
  await new Promise(r=>setTimeout(r,5000));
  const info = await page.evaluate(()=>{
    const uni = document.querySelectorAll(".card__bg")[1]; // 当前卡片的
    const cs = getComputedStyle(uni);
    const rules = Array.from(document.styleSheets).flatMap(sh=>{try{return Array.from(sh.cssRules||[])}catch(e){return[]}}).filter(r=>r.selectorText && r.selectorText.includes("card__bg") && !r.selectorText.includes("placeholder"));
    return {
      pos: cs.position, top: cs.top, bottom: cs.bottom, width: cs.width, height: cs.height,
      rules: rules.map(r=>r.selectorText+" => "+r.style.cssText.slice(0,180)).slice(0,8)
    };
  });
  console.log(JSON.stringify(info,null,1));
  await browser.close();
})();
