import {createServer} from 'vite';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const server=await createServer({optimizeDeps:{entries:['tests/fixtures/materialDimensionViews.jsx']},server:{watch:{ignored:['**/tmp/**']},host:'127.0.0.1',port:5292,strictPort:true},plugins:[{name:'material-dimension-test',configureServer(s){s.middlewares.use('/__dimension_test',async (_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/__dimension_test','<html><body><div id="root"></div><pre id="result">RUNNING</pre><script type="module" src="/tests/fixtures/materialDimensionViews.jsx"></script></body></html>'));});}}]});
await server.listen();
let child,socket;
try{
 child=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-first-run','--no-default-browser-check','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--window-size=1440,1000','--remote-debugging-port=9334','--user-data-dir='+resolve('tmp/material-dimension-browser-profile'),'http://127.0.0.1:5292/__dimension_test'],{windowsHide:true,stdio:'ignore'});
 let page;
 for(let i=0;i<100;i++){try{page=(await (await fetch('http://127.0.0.1:9334/json/list')).json()).find(p=>p.url.includes('__dimension_test'));if(page)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 if(!page)throw Error('Test browser did not start');
 socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let id=0;const pending=new Map();socket.onmessage=event=>{const message=JSON.parse(event.data);if(pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}};
 const send=(method,params={})=>new Promise(resolve=>{const key=++id;pending.set(key,resolve);socket.send(JSON.stringify({id:key,method,params}));});
 let response;for(let i=0;i<5;i++){
  response=await send('Runtime.evaluate',{expression:"(async()=>{for(let i=0;i<400;i++){const text=document.getElementById('result')?.textContent;if(text&&text!=='RUNNING')return text;await new Promise(r=>setTimeout(r,100));}return 'FAIL: test did not finish';})()",awaitPromise:true,returnByValue:true});
  if(!response.error)break;await new Promise(r=>setTimeout(r,200));
 }
 const result=response.result?.result?.value||'FAIL: '+JSON.stringify(response);console.log(result);if(!result.startsWith('PASS:'))process.exitCode=1;
 await send('Browser.close');
}finally{socket?.close();child?.kill();await server.close();}
