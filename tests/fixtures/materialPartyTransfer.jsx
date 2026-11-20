import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter,Routes,Route} from 'react-router';
import MaterialRegisterScreen from '../../src/unit1/screens/MaterialRegisterScreen';
import MaterialBundlesScreen from '../../src/unit1/screens/MaterialBundlesScreen';
import api from '../../src/unit1/api/apiClient';
import '../../src/index.css';
const a='a'.repeat(64),b='b'.repeat(64),common={memberName:'PURLIN',sectionSize:'150X50X15',lengthMm:2300,materialType:'MS',grade:'E350',thicknessMm:2,dispatchedNos:0,transferredInNos:0,transferredOutNos:0,lastProducedAt:'2026-11-20 10:00:00'};
let rows=[{...common,key:a,customerName:'AB',producedNos:100,availableNos:100},{...common,key:b,customerName:'AC',producedNos:25,availableNos:25}],saved=false;
const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:60000},mutations:{retry:false}}});
for(const key of ['unit1-material-bundles','unit1-material-trace','unit1-dispatch-report','unit1-material-transfers'])client.setQueryData([key,b],key==='unit1-material-bundles'?{stock:rows[1],bundles:[]}:key==='unit1-material-trace'?{stock:rows[1],sourceCoils:[]}: {items:[],total:0,pageSize:30,page:1});
api.defaults.adapter=async config=>{
 let data;if(config.url==='/unit1/material-register/transfers'&&config.method==='post'){
  const input=JSON.parse(config.data);if(input.targetParty!=='AC'||input.quantity!==60||input.key!==a)throw Error('Wrong transfer payload');
  saved=true;rows=[{...rows[0],availableNos:40,transferredOutNos:60},{...rows[1],availableNos:85,transferredInNos:60}];data={id:1,targetKey:b};
 }else if(config.url==='/unit1/material-register/transfers')data={items:saved?[{...common,id:1,customerName:'AB',targetParty:'AC',quantity:60,createdAt:'2026-11-20 10:15:00',transferredBy:'Test user'}]:[],page:1,pageSize:30,total:saved?1:0};
 else if(config.url==='/unit1/material-register')data=rows;
 else if(config.url.includes('/bundles/'))data={stock:rows[1],bundles:[{id:7,bundleNo:1,runId:4,quantity:60,dispatchedNos:0,availableNos:60,coilReference:'CQ00000029',usedKg:300,holeScrapKg:6,cutBladeScrapKg:1.2,createdAt:'2026-11-20 10:00:00'}]};
 else if(config.url.includes('/trace/'))data={stock:rows[1],originalParties:['AB'],sourceCoils:[{key:'7:1',reference:'CQ00000029',producedNos:60,usedKg:300,holeScrapKg:6,cutBladeScrapKg:1.2,fields:[],firstProducedAt:'2026-11-20 10:00:00',lastProducedAt:'2026-11-20 10:00:00'}]};
 else throw Error('Unexpected request '+config.url);
 return {data:{data},status:200,statusText:'OK',headers:{},config};
};
const store=configureStore({reducer:{auth:()=>({user:{role:'superadmin'}})}});
createRoot(document.getElementById('root')).render(<Provider store={store}><QueryClientProvider client={client}><MemoryRouter initialEntries={['/production/material-stock']}><Routes><Route path="/production/material-stock" element={<MaterialRegisterScreen/>}/><Route path="/production/material-stock/bundles" element={<MaterialBundlesScreen/>}/></Routes></MemoryRouter></QueryClientProvider></Provider>);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn){for(let i=0;i<100;i++){const value=fn();if(value)return value;await wait(40);}throw Error('Timed out: '+fn);}
const check=(value,message)=>{if(!value)throw Error(message);};
const input=(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));};
try{
 const transfer=await until(()=>document.querySelector('button[title="Transfer party"]'));transfer.click();
 const party=await until(()=>document.querySelector('input[list="material-transfer-parties"]'));input(party,'ac');await wait(50);
 const qty=document.querySelector('dialog input[inputmode="numeric"]');input(qty,'101');await wait(50);
 check([...document.querySelectorAll('dialog button')].find(el=>el.textContent.includes('Transfer stock')).disabled,'Excess transfer accepted');
 input(qty,'60');await wait(50);[...document.querySelectorAll('dialog button')].find(el=>el.textContent.includes('Transfer stock')).click();
 await until(()=>saved&&!document.querySelector('dialog'));
 check(document.body.textContent.includes('85'),'Destination balance did not refresh');
 for(const key of ['unit1-material-bundles','unit1-material-trace','unit1-dispatch-report','unit1-material-transfers'])check(client.getQueryState([key,b]).isInvalidated,'Stale cache: '+key);
 document.querySelector('[aria-label="Party transfer history"]').click();await until(()=>document.querySelector('dialog tbody tr'));
 check(document.querySelector('dialog').textContent.includes('Test user'),'Transfer history missing actor');document.querySelector('dialog [aria-label="Close"]').click();
 const links=[...document.querySelectorAll('a[title="View Bundles"]')];links[1].click();
 await until(()=>document.querySelector('button[title="Print bundle QR"]'));check(document.body.textContent.includes('CQ00000029'),'Source coil missing');
 document.querySelector('button[title="Print bundle QR"]').click();await until(()=>document.querySelector('dialog img'));
 check(document.querySelector('dialog h3').textContent==='AC','QR party did not transfer');check(document.querySelector('dialog strong').textContent.includes('60'),'QR bundle quantity not updated');
 [...document.querySelectorAll('dialog button')].find(el=>el.textContent.includes('View material')).click();await until(()=>document.querySelector('dialog').textContent.includes('Original production parties: AB'));
 check(document.querySelector('dialog').textContent.includes('CQ00000029'),'Transferred QR lost source coil trace');
 document.getElementById('result').textContent='PASS: web party transfer, balances, history, dependent caches, bundle QR and source coil trace';
}catch(error){document.getElementById('result').textContent='FAIL: '+error.stack;}
