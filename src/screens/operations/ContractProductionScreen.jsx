import { useEffect, useMemo, useState } from "react";
import { getContractProductionApi } from "../../api/contractorApi";
import { getCurrentFinancialYearApi } from "../../api/financialYearsApi";
import "./Operations.css";

const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt=(v,d=2)=>Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:d});
export default function ContractProductionScreen(){
 const [year,setYear]=useState(null),[month,setMonth]=useState(new Date().getMonth()+1),[data,setData]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[unit,setUnit]=useState("kg");
 const options=useMemo(()=>{if(!year?.start_date)return[];const start=Number(year.start_date.slice(0,4));return Array.from({length:12},(_,i)=>{const value=((i+3)%12)+1;return{value,label:`${months[value-1]} ${start+(value<4?1:0)}`}})},[year]);
 const load=async(selected=month)=>{setLoading(true);setError("");try{let fy=year;if(!fy){fy=(await getCurrentFinancialYearApi()).data;setYear(fy)};setData((await getContractProductionApi({month:selected,financial_year_id:fy.id})).data)}catch(e){setError(e.response?.data?.message||"Could not load contract production.")}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const weight=v=>unit==="t"?`${fmt(Number(v)/1000,3)} t`:`${fmt(v,3)} kg`;
 const metrics=x=><div className="ops-grid"><div className="ops-metric"><small>MS production</small><strong>{weight(x?.ms_kg)}</strong></div><div className="ops-metric"><small>GI production</small><strong>{weight(x?.gi_kg)}</strong></div><div className="ops-metric"><small>Quantity</small><strong>{fmt(x?.qty,0)} NOS</strong></div></div>;
 return <section className="ops-page"><header className="ops-header"><div><h2>Contract Production</h2><p className="ops-muted">Financial year {year?.financial_year||"—"}</p></div><div className="ops-actions"><select value={month} onChange={e=>setMonth(Number(e.target.value))}>{options.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select><button className="ops-button" onClick={()=>load(month)}>Fetch production</button><button className="ops-button secondary" onClick={()=>setUnit(unit==="kg"?"t":"kg")}>Show {unit==="kg"?"tonnes":"kg"}</button></div></header>{error&&<div className="ops-error">{error}</div>}{loading?<div className="ops-card">Loading production…</div>:data&&<><div className="ops-card"><h3>All contractors · Monthly total</h3>{metrics(data.totals)}</div>{data.summaries?.map(row=><div className="ops-card" key={row.contractor_id}><h3>{row.contractor_name}</h3>{metrics(row)}<p className="ops-muted">{row.entry_count} production entries</p></div>)}{!data.summaries?.length&&<div className="ops-card ops-empty">No contractor production recorded for this month.</div>}</>}</section>;
}
