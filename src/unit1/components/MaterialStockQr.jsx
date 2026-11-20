import {useState,useEffect,useRef} from 'react';
import {Printer} from 'lucide-react';
import QRCode from 'qrcode';
import WorkflowDialog from './WorkflowDialog';
import {materialStockQrPayload} from '../utils/materialStockQr';
import {materialStockQrLabels} from '../utils/materialStockQrLabels';
import {printCount} from '../utils/invoiceQrLabels';
import './MaterialStockQr.css';
export default function MaterialStockQr({stock,bundle,onClose,onView}){
 const [image,setImage]=useState(''),[error,setError]=useState(''),[copies,setCopies]=useState('1'),[printing,setPrinting]=useState(false),frameRef=useRef(null);const payload=stock?materialStockQrPayload(stock):'';
 const bundleQuantity=bundle?.quantity;
 useEffect(()=>{let active=true;setImage('');setError('');if(payload)QRCode.toDataURL(payload,{width:600,margin:4,errorCorrectionLevel:'M'}).then(v=>{if(active)setImage(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[payload]);
 useEffect(()=>()=>{frameRef.current?.remove();},[]);
 const print=()=>{
  if(!stock||!image||!printCount(copies)||!printCount(bundleQuantity)||printing)return;
  setError('');setPrinting(true);
  const frame=document.createElement('iframe');frame.title='Material bundle QR labels';frame.style.cssText='position:fixed;width:0;height:0;border:0;';
  frameRef.current?.remove();frameRef.current=frame;
  frame.onload=async()=>{try{
   await Promise.all([...frame.contentDocument.images].map(img=>img.decode()));
   frame.contentWindow.addEventListener('afterprint',()=>{frame.remove();setPrinting(false);},{once:true});
   frame.contentWindow.focus();frame.contentWindow.print();setPrinting(false);
  }catch(e){frame.remove();setError(e.message);setPrinting(false);}};
  try{frame.srcdoc=materialStockQrLabels(stock,image,copies,bundleQuantity);document.body.appendChild(frame);}catch(e){frame.remove();setError(e.message);setPrinting(false);}
 };
 return <WorkflowDialog title="Material bundle QR" className="material-stock-qr-dialog" onClose={onClose} busy={printing}><div className="material-stock-qr-content">{stock?<>{image?<img src={image} alt="Material stock QR code" width={200} height={200}/>:!error&&<p>Loading QR…</p>}<h3>{stock.customerName||'Party not recorded'}</h3><p>{stock.memberName} · {stock.sectionSize} · {stock.lengthMm} mm</p>
 {bundle&&<p>Bundle #{bundle.bundleNo} · Run {bundle.runId}</p>}
 <strong>Bundle quantity (NOS): {printCount(bundleQuantity)?Number(bundleQuantity).toLocaleString('en-IN'):'Not recorded'}</strong>
 <label className="material-stock-qr-quantity">Print quantity<input inputMode="numeric" value={copies} onChange={e=>setCopies(e.target.value)} disabled={printing}/></label>
 <p>All copies use this material QR and the selected bundle’s recorded quantity.</p>
 <button type="button" className="primary-button material-stock-qr-print" disabled={printing||!image||!printCount(copies)||!printCount(bundleQuantity)} onClick={print}><Printer size={18}/>{printing?'Printing…':'Print QR'}</button>
 <button type="button" className="outline-button" disabled={printing} onClick={onView}>View material &amp; source coils</button></>:<p>This material changed. Select its updated stock row.</p>}{error&&<p role="alert" className="notice error">{error}</p>}</div></WorkflowDialog>;
}
