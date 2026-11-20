import {useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {ArrowRightLeft} from 'lucide-react';
import WorkflowDialog from './WorkflowDialog';
import {getMaterialRegister,getMaterialTransfers,transferMaterialParty} from '../api/materialRegisterApi';
import {jobCardChangeKeys} from '../utils/jobCardChangeKeys';
import {formatDateTime} from '../utils/dateTime';
import './MaterialPartyTransfer.css';
const errorText=e=>e?.response?.data?.error||e?.message;
export default function MaterialPartyTransfer({stockKey,history=false,onClose}){
  const client=useQueryClient(),[targetParty,setTargetParty]=useState(''),[quantity,setQuantity]=useState(null),[page,setPage]=useState(1),[requestId]=useState(()=>crypto.randomUUID());
  const stock=useQuery({queryKey:['unit1-material-register'],queryFn:getMaterialRegister,enabled:!history,refetchInterval:10000});
  const report=useQuery({queryKey:['unit1-material-transfers',page],queryFn:()=>getMaterialTransfers(page),enabled:history,refetchInterval:10000});
  const current=stock.data?.find(r=>r.key===stockKey),qty=quantity??String(Math.min(current?.availableNos||0,1000000));
  const save=useMutation({mutationFn:transferMaterialParty,onSuccess:async()=>{await Promise.all(jobCardChangeKeys.map(key=>client.invalidateQueries({queryKey:[key]})));onClose();}});
  const valid=current&&/^[1-9]\d*$/.test(qty)&&Number(qty)<=current.availableNos&&Number(qty)<=1000000&&targetParty.trim()&&targetParty.trim().toUpperCase()!==current.customerName.trim().toUpperCase();
  const parties=[...new Set((stock.data||[]).map(r=>r.customerName).filter(name=>name&&name!==current?.customerName))];
  return <WorkflowDialog title={history?'Party transfer history':'Transfer party'} className={`material-party-transfer ${history?'transfer-history':''}`} onClose={onClose} busy={save.isPending}><div className="party-transfer-body">
    {history?<>{report.isPending&&<p>Loading transfers…</p>}{report.isError&&<p role="alert" className="notice error">{errorText(report.error)}</p>}{report.data&&<><div className="coil-register-table stock-grid"><table><thead><tr>{['Date & time','From party','To party','Structure / Section','Cut length (mm)','Material / Grade / Thickness','Quantity (nos)','Transferred by'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{report.data.items.map(r=><tr key={r.id}><td>{formatDateTime(r.createdAt)}</td><td>{r.customerName}</td><td>{r.targetParty}</td><td>{r.memberName} · {r.sectionSize}</td><td>{r.lengthMm}</td><td>{r.materialType} · {r.grade} · {r.thicknessMm} mm</td><td>{r.quantity}</td><td>{r.transferredBy||'—'}</td></tr>)}</tbody></table></div>{!report.data.items.length&&<p>No party transfers yet.</p>}<div className="party-transfer-actions"><button className="outline-button" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button className="outline-button" disabled={page*report.data.pageSize>=report.data.total} onClick={()=>setPage(p=>p+1)}>Next</button></div></>}</>:<>
      {stock.isPending&&<p>Loading stock…</p>}{stock.isError&&<p role="alert" className="notice error">{errorText(stock.error)}</p>}{stock.isSuccess&&!current&&<p role="alert">Stock changed. Close this form and select the material again.</p>}
      {current&&<><div className="party-transfer-source"><span>From party</span><strong>{current.customerName||'Party not recorded'}</strong><p>{current.memberName} · {current.sectionSize} · {current.lengthMm} mm</p><p>{current.materialType} · {current.grade} · {current.thicknessMm} mm</p><strong>Available: {current.availableNos.toLocaleString('en-IN')} nos</strong></div>
      <label className="form-field">To party<input autoFocus list="material-transfer-parties" placeholder="Select or enter party name" maxLength={160} value={targetParty} disabled={save.isPending} onChange={e=>setTargetParty(e.target.value.toUpperCase())}/></label><datalist id="material-transfer-parties">{parties.map(name=><option key={name} value={name}/>)}</datalist>
      <label className="form-field">Transfer quantity (nos)<input inputMode="numeric" value={qty} disabled={save.isPending} onChange={e=>setQuantity(e.target.value)}/></label>
      <p className="party-transfer-note">Matching material will merge into the destination party’s stock. Original planning and source coil details stay linked.</p></>}
      {save.isError&&<p role="alert" className="notice error">{errorText(save.error)}</p>}<div className="party-transfer-actions"><button className="outline-button" disabled={save.isPending} onClick={onClose}>Cancel</button><button className="primary-button" disabled={!valid||save.isPending} onClick={()=>save.mutate({key:stockKey,targetParty,quantity:Number(qty),requestId})}><ArrowRightLeft size={17}/>{save.isPending?'Transferring…':'Transfer stock'}</button></div>
    </>}
  </div></WorkflowDialog>;
}
