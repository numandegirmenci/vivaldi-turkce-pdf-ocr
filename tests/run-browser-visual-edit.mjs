import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=process.env.CHROME_BIN||
  ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser',
    '/opt/google/chrome/chrome'].find(filename=>fs.existsSync(filename))||
  (()=>{for(const n of ['google-chrome','chromium','chromium-browser']){
    const r=spawnSync('which',[n],{encoding:'utf8'});
    if(r.status===0)return r.stdout.trim();
  }return null;})();
if(!browser){
  console.error('Chromium/Chrome bulunamadı. Tarayıcı görsel testi çalıştırılamadı.');
  process.exit(1);
}
const server=http.createServer((req,res)=>{
  const decoded=decodeURIComponent(new URL(req.url,'http://127.0.0.1/').pathname);
  const target=path.resolve(root,'.'+decoded);
  if(!target.startsWith(root+path.sep)){
    res.writeHead(403).end('forbidden');return;
  }
  fs.readFile(target,(error,data)=>{
    if(error){res.writeHead(404).end('not found');return;}
    const type=target.endsWith('.mjs')?'text/javascript':
      target.endsWith('.html')?'text/html':target.endsWith('.css')?'text/css':
      target.endsWith('.ttf')?'font/ttf':'application/octet-stream';
    res.setHeader('Content-Type',type);
    res.end(data);
  });
});
await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
});
const port=server.address().port;
const url='http://127.0.0.1:'+port+'/tests/browser-visual-edit.html';
let result='',errors='';
try{
  const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--disable-extensions','--no-first-run','--disable-background-networking',
    '--virtual-time-budget=12000','--dump-dom',url];
  const child=spawn(browser,args,{stdio:['ignore','pipe','pipe']});
  const completed=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>child.kill('SIGKILL'),30000);
    child.stdout.on('data',b=>{result+=String(b);});
    child.stderr.on('data',b=>{errors+=String(b);});
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('close',code=>{clearTimeout(timer);resolve(code);});
  });
  if(completed!==0||!result.includes('data-result="pass"')){
    const context=result.match(/<pre id="result"[^>]*>([\s\S]*?)<\/pre>/)?.[1]||result.slice(-700);
    throw new Error('Chromium visual edit test failed: '+context+
      ' (exit='+completed+', stderr='+errors.slice(-500)+')');
  }
  console.log('✓ Chromium image edit succeeded: '+
    (result.match(/<pre id="result"[^>]*>([^<]*)<\/pre>/)?.[1]||'PASS'));
}finally{await new Promise(resolve=>server.close(resolve));}
