const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({headless:'new', args:['--no-sandbox']});
  const p = await b.newPage();
  await p.setViewport({width:390,height:844});
  await p.goto('http://localhost:5173/#/pages/discover/index',{waitUntil:'networkidle2',timeout:60000});
  await new Promise(r=>setTimeout(r,4000));

  const out = await p.evaluate(() => {
    const res = {};
    const ui = document.querySelector('uni-image');
    res.uniImageOuter = ui ? ui.outerHTML.slice(0,600) : 'NONE';
    // the visible layer inside uni-image
    if (ui) {
      const div = ui.querySelector('div');
      const img = ui.querySelector('img');
      res.innerDiv = div ? {style: div.getAttribute('style'), cs_bg: getComputedStyle(div).backgroundImage.slice(0,120), op: getComputedStyle(div).opacity} : null;
      res.innerImg = img ? {op: getComputedStyle(img).opacity, w: img.naturalWidth} : null;
      res.uniImageOpacity = getComputedStyle(ui).opacity;
      res.uniImageClass = ui.className;
    }
    // card structure boxes
    res.boxes = [];
    for (const sel of ['.card-swiper','.card','.card__bg','.safe-image','uni-image']) {
      document.querySelectorAll(sel).forEach((el,i)=>{
        if(i>1) return;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        res.boxes.push({sel:sel+'#'+i, x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height), op:cs.opacity, vis:cs.visibility, disp:cs.display, ov:cs.overflow});
      });
    }
    return res;
  });
  console.log(JSON.stringify(out,null,2));
  await p.screenshot({path:'diag_card.png'});
  await b.close();
})();
