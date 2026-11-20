import test from 'node:test';
import assert from 'node:assert/strict';
import {materialStockQrLabels} from '../src/unit1/utils/materialStockQrLabels.js';
import {materialStockQrPayload,parseMaterialStockQr} from '../src/unit1/utils/materialStockQr.js';
const stock={key:'a'.repeat(64),customerName:'TEST & PARTY',memberName:'HAT PURLIN',sectionSize:'150 x 65 x 20 x 10',lengthMm:2300,materialType:'GL',grade:'G550',thicknessMm:2};
test('every material label uses the same QR image with party and material details',()=>{
 const html=materialStockQrLabels(stock,'data:image/png;base64,QR_IMAGE','4','100');
 assert.equal((html.match(/<article>/g)||[]).length,4);
 assert.equal((html.match(/data:image\/png;base64,QR_IMAGE/g)||[]).length,4);
 for(const text of ['TEST &amp; PARTY','HAT PURLIN','150X65X20X10 - 2300MM','BUNDLE QTY: 100 NOS'])assert.ok(html.includes(text));
 assert.equal((html.match(/BUNDLE QTY: 100 NOS/g)||[]).length,4);
 assert.ok(!html.includes('G550'));
 assert.equal(parseMaterialStockQr(materialStockQrPayload(stock)),stock.key);
});
test('invalid quantities are rejected and printed details are HTML escaped',()=>{
 for(const value of ['','0','-1','1.5','foo'])assert.throws(()=>materialStockQrLabels(stock,'data:image/png;base64,QR_IMAGE',value,100));
 for(const value of [null,undefined,'','0','-1','1.5','foo'])assert.throws(()=>materialStockQrLabels(stock,'data:image/png;base64,QR_IMAGE',1,value),/pieces in one bundle/);
 const html=materialStockQrLabels({...stock,customerName:'<script>alert(1)</script>'},'" onerror="alert(1)','1',100);
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;SCRIPT&gt;'));
 assert.ok(!html.includes('src="" onerror='));
});

test('label text is uppercase and cut length rounds upward without changing source data or QR image',()=>{
 const data={...stock,customerName:'Test party',memberName:'Hat purlin',materialType:'Posmac',grade:'grade 250',lengthMm:'2300.200'};
 const html=materialStockQrLabels(data,'data:image/png;base64,aBcDeF','1',64);
 for(const text of ['TEST PARTY','HAT PURLIN','BUNDLE QTY: 64 NOS','150X65X20X10 - 2301MM'])assert.ok(html.includes(text));
 assert.ok(!html.includes('POSMAC'));assert.ok(!html.includes('GRADE 250'));
 assert.ok(html.includes('data:image/png;base64,aBcDeF'));
 assert.equal(data.lengthMm,'2300.200');assert.equal(data.customerName,'Test party');
 assert.ok(materialStockQrLabels({...data,lengthMm:'2300.000'},'QR','1',64).includes('150X65X20X10 - 2300MM'));
 assert.equal(parseMaterialStockQr(materialStockQrPayload(data)),stock.key);
});
