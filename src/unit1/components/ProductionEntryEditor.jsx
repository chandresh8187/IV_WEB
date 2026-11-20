import {useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {Save} from 'lucide-react';
import WorkflowDialog from './WorkflowDialog';
import {correctProductionEntry} from '../api/productionApi';
import {jobCardChangeKeys} from '../utils/jobCardChangeKeys';
import './ProductionEntryEditor.css';

export default function ProductionEntryEditor({entry,onClose}) {
 const [pieces,setPieces]=useState(String(entry.pieces)),[reason,setReason]=useState('');
 const [requestKey]=useState(()=>crypto.randomUUID());
 const client=useQueryClient();
 const save=useMutation({mutationFn:correctProductionEntry,onSuccess:async()=>{
  await Promise.all(jobCardChangeKeys.map(key=>client.invalidateQueries({queryKey:[key]})));
  onClose();
 }});
 const valid=/^[1-9]\d*$/.test(pieces)&&Number(pieces)<=100000&&reason.trim().length>0;
 return <WorkflowDialog title="Edit production entry" className="production-entry-editor" busy={save.isPending} onClose={onClose}>
  <form onSubmit={event=>{event.preventDefault();if(valid&&!save.isPending)save.mutate({id:entry.id,pieces:Number(pieces),expectedPieces:Number(entry.pieces),reason:reason.trim(),requestKey});}}>
   <p>{entry.machineName} · Bundle #{entry.bundleNo} · {entry.memberName}</p>
   <p>Recorded quantity: <strong>{entry.pieces} NOS</strong></p>
   <label>Production quantity (NOS)<input inputMode="numeric" value={pieces} onChange={event=>setPieces(event.target.value)} disabled={save.isPending}/></label>
   <label>Correction reason<textarea maxLength={255} value={reason} onChange={event=>setReason(event.target.value)} disabled={save.isPending}/></label>
   {save.isError&&<p role="alert" className="notice error">{save.error?.response?.data?.error||save.error?.response?.data?.message||save.error?.message}</p>}
   <button type="submit" className="primary-button" disabled={!valid||save.isPending}><Save size={18}/>{save.isPending?'Saving…':'Save changes'}</button>
  </form>
 </WorkflowDialog>;
}
