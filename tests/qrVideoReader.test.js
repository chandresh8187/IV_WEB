import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {decodeQrPixels,createQrVideoReader} from '../src/unit1/utils/qrVideoReader.js';
function pixels(payload){
 const qr=QRCode.create(payload,{errorCorrectionLevel:'M'}),scale=5,margin=4,width=(qr.modules.size+margin*2)*scale,data=new Uint8ClampedArray(width*width*4).fill(255);
 for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(qr.modules.get(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const i=(((y+margin)*scale+dy)*width+(x+margin)*scale+dx)*4;data[i]=data[i+1]=data[i+2]=0;}
 return {data,width};
}
test('software fallback reads both installed-coil and shared-party QR labels',async()=>{
 for(const payload of ['ivs1:///scan/coil/100241/2','https://webapp.ivsquarestructure.com/unit1/scan/coil/100241/2','ivs1:///scan/material-party/AB23CD45EF']){const {data,width}=pixels(payload);assert.equal((await decodeQrPixels(data,width,width))[0].rawValue,payload);}
});
test('software scanner waits for a real camera frame instead of reading zero-size black frames',async()=>{
 assert.deepEqual(await createQrVideoReader().detect({videoWidth:0,videoHeight:0}),[]);
});
test('native scanning is used when available without requiring a software canvas',async()=>{
 const original=globalThis.BarcodeDetector;
 try{globalThis.BarcodeDetector=class{async detect(){return [{rawValue:'native-qr'}];}};assert.equal((await createQrVideoReader().detect({}))[0].rawValue,'native-qr');}
 finally{if(original)globalThis.BarcodeDetector=original;else delete globalThis.BarcodeDetector;}
});
