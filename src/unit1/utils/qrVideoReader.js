let decoder;
export async function decodeQrPixels(data,width,height){
 decoder ||= import('jsqr').then(module=>module.default);
 const code=(await decoder)(data,width,height,{inversionAttempts:'attemptBoth'});
 return code?[{rawValue:code.data}]:[];
}
export function createQrVideoReader(){
 let native;
 try{if(globalThis.BarcodeDetector)native=new globalThis.BarcodeDetector({formats:['qr_code']});}catch{/* Use the image decoder when native QR support is absent. */}
 let canvas,context,lastFrame=-Infinity;
 return {async detect(video){
  if(native){try{return await native.detect(video);}catch{native=null;}}
  if(!video.videoWidth||!video.videoHeight)return [];
  const now=performance.now();if(now-lastFrame<120)return [];lastFrame=now;
  canvas ||= document.createElement('canvas');
  context ||= canvas.getContext('2d',{willReadFrequently:true});
  if(!context)throw new Error('QR camera frames could not be read. Enter the printed ID instead.');
  const scale=Math.min(1,960/video.videoWidth);
  canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  context.drawImage(video,0,0,canvas.width,canvas.height);
  return decodeQrPixels(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
 }};
}
