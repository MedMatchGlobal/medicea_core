// Render the owner's supplied SVG artwork. No redraw, generative image edit or
// colour substitution. Set MEDICEA_PLAYWRIGHT_PATH when Playwright is bundled.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.MEDICEA_PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const full=read('public/brand/medicea-logo.svg'),icon=read('public/brand/medicea-icon.svg');
const dimensions=p=>{const bytes=fs.readFileSync(p);return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];};
async function main(){const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({deviceScaleFactor:1});
 async function render(relative,width,height,art,padding=0,background='transparent',round=false){
  await page.setViewportSize({width,height});
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%}body{display:grid;place-items:center;padding:${padding}px;background:${background};${round?'border-radius:50%;overflow:hidden;':''}}svg{display:block;width:100%;height:100%}</style>`+art);
  await page.locator('svg').evaluate(svg=>Promise.all(Array.from(svg.querySelectorAll('image'),img=>new Promise(resolve=>{const image=new Image();image.onload=image.onerror=resolve;image.src=img.getAttribute('href')||img.getAttribute('xlink:href')||'';}))));
  await page.screenshot({path:path.join(root,relative),omitBackground:background==='transparent'});
 }
 await render('public/logo.png',960,344,full);
 await render('public/brand/medicea-checkout-logo.png',960,344,full,0,'white');
 await render('resources/icon.png',1024,1024,icon,165,'white');
 await render('public/ic_launcher.png.png',512,512,icon,80,'white');
 await render('public/brand/medicea-icon-256.png',256,256,icon,28,'white');
 for(const dir of fs.readdirSync(path.join(root,'android/app/src/main/res'))){
  const folder=path.join(root,'android/app/src/main/res',dir);
  if(!fs.statSync(folder).isDirectory())continue;
  for(const name of fs.readdirSync(folder)){
   if(!/^(ic_launcher(?:_foreground|_round)?|splash)\.png$/.test(name))continue;
   const file=path.join(folder,name),[width,height]=dimensions(file),relative=path.relative(root,file);
   if(name==='splash.png'){
    const targetWidth=Math.min(width*.64,height*1.5),targetHeight=targetWidth/2.79;
    const art=full.replace('<svg ','<svg width="'+targetWidth+'" height="'+targetHeight+'" ');
    await page.setViewportSize({width,height});await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:white}body{display:grid;place-items:center}svg{width:${targetWidth}px;height:${targetHeight}px}</style>`+art);await page.screenshot({path:file});
   }else await render(relative,width,height,icon,Math.round(width*(name.includes('foreground')?.25:.16)),name.includes('foreground')?'transparent':'white',name.includes('round'));
  }
 }
 const png=fs.readFileSync(path.join(root,'public/brand/medicea-icon-256.png')),head=Buffer.alloc(22);
 head.writeUInt16LE(1,2);head.writeUInt16LE(1,4);head[6]=0;head[7]=0;head.writeUInt16LE(1,10);head.writeUInt16LE(32,12);head.writeUInt32LE(png.length,14);head.writeUInt32LE(22,18);
 fs.writeFileSync(path.join(root,'public/favicon.ico'),Buffer.concat([head,png]));
 fs.mkdirSync(path.join(root,'admin-console/public/brand'),{recursive:true});
 for(const name of ['medicea-logo.svg','medicea-wordmark.svg','medicea-icon.svg','medicea-icon-256.png'])fs.copyFileSync(path.join(root,'public/brand',name),path.join(root,'admin-console/public/brand',name));
 fs.copyFileSync(path.join(root,'public/favicon.ico'),path.join(root,'admin-console/public/favicon.ico'));
 await browser.close();console.log('Rendered web, browser, Android launcher and splash branding from the supplied SVG.');
}
main().catch(()=>{console.error('Brand rendering failed.');process.exitCode=1;});
