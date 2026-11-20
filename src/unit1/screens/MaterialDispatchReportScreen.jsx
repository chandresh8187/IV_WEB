import {useState} from 'react';
import {Link} from 'react-router';
import {useQuery} from '@tanstack/react-query';
import {useSelector} from 'react-redux';
import {getDispatchReport} from '../api/materialRegisterApi';
import {hasAccess} from '../utils/access';
import {formatDate,formatDateTime} from '../utils/dateTime';
import './CoilStockScreen.css';
export default function MaterialDispatchReportScreen(){
 const allowed=useSelector(s=>hasAccess(s.auth.user,'unit1.material-stock.view')),[q,setQ]=useState(''),[page,setPage]=useState(1);
 const report=useQuery({queryKey:['unit1-dispatch-report',q,page],queryFn:()=>getDispatchReport(q,page),enabled:allowed,refetchInterval:10000});
 if(!allowed)return <p>Material stock access is required.</p>;
 return <section className="coil-register"><header className="coil-register-heading"><h1>Dispatch report</h1><Link className="outline-button" to="/production/material-stock">Back to stock</Link></header><div className="coil-register-panel"><div className="coil-register-toolbar"><label>Search DC number, party or material<input type="search" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/></label></div>{report.isPending&&<p>Loading dispatches…</p>}{report.isError&&<p role="alert" className="notice error">{report.error?.response?.data?.error||report.error?.message}</p>}{report.isSuccess&&<><div className="coil-register-table"><table><thead><tr>{['DC number','DC date','Dispatch to','Party','Structure Type','Section (mm)','Cut length (mm)','Dispatched QTY (nos)','Weight (kg)','Saved date & time','Dispatched by'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{report.data.items.map(r=><tr key={r.id}><td>{r.dcNumber}</td><td>{formatDate(r.dcDate)}</td><td>{r.destination==='unit2'?'To UNIT 2':r.destination==='other'?'To Other':'Not recorded'}</td><td>{r.customerName||'Party not recorded'}</td><td>{r.memberName}</td><td>{r.sectionSize}</td><td>{r.lengthMm}</td><td>{r.dispatchQty}</td><td>{r.weightKg}</td><td>{formatDateTime(r.createdAt)}</td><td>{r.dispatchedBy}</td></tr>)}{!report.data.items.length&&<tr><td colSpan={11}>No matching dispatches.</td></tr>}</tbody></table></div><footer>{report.data.total} material transactions<div className="coil-line-actions"><button className="outline-button" disabled={page<=1} onClick={()=>setPage(v=>v-1)}>Previous</button><span>{page} / {Math.max(1,Math.ceil(report.data.total/report.data.pageSize))}</span><button className="outline-button" disabled={page*report.data.pageSize>=report.data.total} onClick={()=>setPage(v=>v+1)}>Next</button></div></footer></>}</div></section>;
}
