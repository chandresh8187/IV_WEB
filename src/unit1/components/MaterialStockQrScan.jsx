import {useEffect,useRef,useState} from 'react';
import WorkflowDialog from './WorkflowDialog';
import {createQrVideoReader} from '../utils/qrVideoReader';
export default function MaterialStockQrScan({onRead,onClose}){
 const video=useRef(null),[error,setError]=useState('');
 useEffect(()=>{let active=true,stream,frame,scanned=false;const reader=createQrVideoReader();const tick=async()=>{if(!active||scanned)return;try{const codes=video.current?await reader.detect(video.current):[];if(active&&codes[0]?.rawValue){scanned=true;onRead(codes[0].rawValue);return;}}catch(e){if(active)setError(e.message);}if(active)frame=requestAnimationFrame(tick);};(async()=>{try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(!active){stream.getTracks().forEach(t=>t.stop());return;}video.current.srcObject=stream;await video.current.play();if(active)frame=requestAnimationFrame(tick);}catch(e){if(active)setError(e.message||'Allow camera access to scan the QR code.');}})();return()=>{active=false;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());};},[onRead]);
 return <WorkflowDialog title="Scan material QR" onClose={onClose}><div className="coil-stock-form-panel"><video ref={video} autoPlay playsInline muted style={{width:'100%',maxHeight:'55dvh',objectFit:'cover',borderRadius:10}}/><p>Scan the QR on a material bundle.</p>{error&&<p role="alert" className="notice error">{error}</p>}</div></WorkflowDialog>;
}
