import {createServer} from 'vite';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const server=await createServer({optimizeDeps:{entries:['tests/fixtures/materialPartyTransfer.jsx']},server:{watch:{ignored:['**/tmp/**']},host:'127.0.0.1',port:5291,strictPort:true},plugins:[{name:'material-transfer-test',configureServer(s){s.middlewares.use('/__party_transfer_test',async (_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/__party_transfer_test','<html><body><div id="root"></div><pre id="result">RUNNING</pre><script type="module" src="/tests/fixtures/materialPartyTransfer.jsx"></script></body></html>'));});}}]});
await server.listen();
try{
 const args=['--headless=new','--no-first-run','--no-default-browser-check','--disable-gpu','--window-size=1100,850','--user-data-dir='+resolve('tmp/party-transfer-browser-profile'),'--virtual-time-budget=15000','--dump-dom','http://127.0.0.1:5291/__party_transfer_test'];
 const child=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args,{windowsHide:true});let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.resume();
 const timer=setTimeout(()=>child.kill(),60000);const code=await new Promise(resolve=>child.on('exit',resolve));clearTimeout(timer);
 const result=output.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1]||'FAIL: no browser result (exit '+code+')';console.log(result);if(!result.startsWith('PASS:'))process.exitCode=1;
}finally{await server.close();}
