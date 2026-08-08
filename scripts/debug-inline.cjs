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
    const unis = Array.from(document.querySelectorAll(".card__bg"));
    return unis.map(u=>({
      inlineStyle: u.getAttribute("style"),
      isAttr: u.getAttribute("is"),
      parentClass: u.parentElement?.className?.slice(0,40),
      parentRect: (()=>{const r=u.parentElement.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})(),
    }));
  });
  console.log(JSON.stringify(info,null,1));
  await browser.close();
})();
