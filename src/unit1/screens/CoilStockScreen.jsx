import CoilStockEntry from '../components/CoilStockEntry';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useSelector} from 'react-redux';
import {Plus,RefreshCw,PackageSearch,Eye} from 'lucide-react';
import {getCoilStock} from '../api/coilApi';
import {hasAccess} from '../utils/access';
import {formatDateTime} from '../utils/dateTime';
import {useMatch,useNavigate} from 'react-router';
import './CoilStockScreen.css';
const fmt=v=>Number(v).toLocaleString('en-IN',{maximumFractionDigits:3});
const errorText=e=>e?.response?.data?.error||e?.message;
export default function CoilStockScreen(){
 const adding=!!useMatch('/coils/add'),navigate=useNavigate();
 const user=useSelector(s=>s.auth.user),canView=hasAccess(user,'unit1.coils.view'),canAdd=hasAccess(user,'unit1.coils.create');
 const [search,setSearch]=useState('');
 const stock=useQuery({queryKey:['coils','stock-register'],queryFn:getCoilStock,enabled:canView&&!adding,refetchInterval:10000});
 const rows=(stock.data||[]).filter(r=>`${r.widthMm}x${r.thicknessMm} ${r.materialType} ${r.grade}`.toLowerCase().includes(search.trim().toLowerCase().replace(/[×*]/g,'x')));
 if(!canView)return <p>Coil stock access is required.</p>;
 if(adding)return canAdd?<section className="coil-register coil-stock-full-page"><header className="coil-register-heading"><div><span>INVENTORY / RAW MATERIAL</span><h1>Add stock</h1></div><button className="outline-button" onClick={()=>navigate('/coils')}>Back to stock</button></header><CoilStockEntry onClose={()=>navigate('/coils')}/></section>:<p>Add stock access is required.</p>;
 return <section className="coil-register"><header className="coil-register-heading"><div><span>INVENTORY / RAW MATERIAL</span><h1>Coil stock</h1></div>{canAdd&&<button className="primary-button" onClick={()=>navigate('/coils/add')}><Plus size={18}/>Add stock</button>}</header>
 <div className="coil-register-summary">{[['Available stock',`${fmt((stock.data||[]).reduce((n,r)=>n+Number(r.availableKg),0)/1000)} ton`],['Stock sizes',stock.data?.length||0],['Receipts',(stock.data||[]).reduce((n,r)=>n+r.receiptCount,0)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
 <div className="coil-register-panel"><div className="coil-register-toolbar"><label>Search stock<input type="search" placeholder="Size, material or grade" value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="outline-button stock-icon-button" aria-label="Refresh stock" disabled={stock.isFetching} onClick={()=>stock.refetch()}><RefreshCw size={17}/></button></div>
 {stock.isPending&&<p className="coil-register-notice">Loading stock…</p>}{stock.isError&&<p role="alert" className="notice error">{errorText(stock.error)}</p>}
 {stock.isSuccess&&(rows.length?<div className="coil-register-table stock-grid" role="region" tabIndex={0} aria-label="Coil stock table"><table><thead><tr>{['Coil size (mm)','Material','Grade','Received (kg)','Used (kg)','Available (ton)','Receipts','Last received','Actions'].map((h,i)=><th className={i>=3&&i<=6?'number':undefined} key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.key}><td><strong>{r.widthMm} × {r.thicknessMm}</strong></td><td>{r.materialType}</td><td>{r.grade}</td><td className="number">{fmt(r.receivedKg)}</td><td className="number">{fmt(r.usedKg)}</td><td className="number"><strong className={r.availableKg>0?'stock-positive':''}>{fmt(r.availableKg/1000)} ton</strong>{r.pendingWeights>0&&<small>Some weights pending</small>}</td><td className="number">{r.receiptCount}</td><td>{formatDateTime(r.lastReceivedAt)}</td><td><button className="outline-button stock-icon-button" title="View invoices" aria-label="View invoices" onClick={()=>navigate('/coils/invoices?'+new URLSearchParams({widthMm:r.widthMm,thicknessMm:r.thicknessMm,materialType:r.materialType,grade:r.grade}))}><Eye size={17}/></button></td></tr>)}</tbody></table></div>:<div className="coil-register-empty"><PackageSearch size={30}/><strong>{search?'No matching stock':'No coil stock yet'}</strong><p>{search?'Try another size, material or grade.':'Use Add stock to record your first receipt.'}</p></div>)}
 <footer>{rows.length} stock sizes shown <span>Available in ton · Received/used in kg</span></footer></div>

 </section>;
}
