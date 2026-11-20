import {Link} from 'react-router';
import {useQuery} from '@tanstack/react-query';
import {useSelector} from 'react-redux';
import {ArrowUpRight,BarChart3,CalendarDays,ClipboardList,Layers3,Package,Play,RefreshCw} from 'lucide-react';
import {hasAccess} from '../utils/access';
import {getMonthlyProduction} from '../api/productionApi';
import './HomeScreen.css';
const number=value=>value==null||!Number.isFinite(Number(value))?'—':Number(value).toLocaleString('en-IN',{maximumFractionDigits:3});
const statusFor=query=>query.isError?'Unavailable':!query.data?.month?'Loading…':Number(query.data.bundleCount)===0?'No production yet':query.data.scrapSplitIssue||query.data.unknownHoleBundles>0?'Needs review':query.data.isEstimated?'Estimated · scrap pending':'Weight confirmed';
export default function HomeScreen(){
 const user=useSelector(state=>state.auth.user),showProduction=user?.role!=='labour'&&hasAccess(user,'unit1.production.view');
 const monthly=useQuery({queryKey:['unit1-monthly-production'],queryFn:getMonthlyProduction,enabled:showProduction,refetchInterval:30000});
 const data=monthly.isError?null:monthly.data;
 const metrics=[{label:'Coil used',value:number(data?.coilUsedKg),Icon:Layers3},{label:'Hole scrap',value:number(data?.holeScrapKg),Icon:BarChart3},{label:'Cut blade scrap',value:number(data?.cutBladeScrapKg),Icon:BarChart3},{label:'Other scrap',value:data?.isEstimated?'Pending':number(data?.otherScrapKg),Icon:Package}];
 const actions=[{label:'Live production',path:'/production/live',Icon:Play,permission:'unit1.production.view'},{label:'Production planning',path:'/production/planning',Icon:ClipboardList,permission:'unit1.production.view',manager:true}].filter(a=>hasAccess(user,a.permission)&&(!a.manager||user?.role!=='labour'));
 return <div className="u1-dashboard"><header className="u1-dash-header"><div><span className="u1-dash-eyebrow">UNIT 1</span><h1>Dashboard</h1></div>{showProduction&&<button className="u1-dash-refresh" type="button" aria-label="Refresh dashboard" disabled={monthly.isFetching} onClick={()=>monthly.refetch()}><RefreshCw size={18}/></button>}</header>
 <div className={`u1-dash-layout${showProduction?'':' u1-dash-layout-simple'}`}>
 {showProduction&&<section className="u1-dash-overview" aria-label="Production overview"><article className="u1-dash-hero"><div className="u1-dash-hero-top"><span><CalendarDays size={16}/>{data?.monthLabel||'Current month'}</span><BarChart3 size={27}/></div><h2>Monthly production</h2><div className="u1-dash-total"><strong>{number(data?.productionTonnes)}</strong><span>ton</span></div><span className="u1-dash-status"><i aria-hidden="true"/>{statusFor(monthly)}</span></article>
 <div className="u1-dash-metrics">{metrics.map(({label,value,Icon})=><article key={label}><Icon size={19}/><h3>{label}</h3><strong>{value}</strong>{value!=='Pending'&&value!=='—'&&<span>kg</span>}</article>)}</div>
 {monthly.isError&&<div className="u1-dash-error" role="alert">Production totals unavailable.<button type="button" onClick={()=>monthly.refetch()}>Retry</button></div>}
 </section>}
 <section className="u1-dash-access" aria-label="Quick access"><h2>Quick access</h2><div className="u1-dash-actions">{actions.map(({label,path,Icon})=><Link className="u1-dash-action" key={path} to={path}><div><span className="u1-dash-icon"><Icon size={23}/></span><ArrowUpRight size={19}/></div><strong>{label}</strong></Link>)}</div>{!actions.length&&<p>Your workspace is ready.</p>}</section>
 </div></div>;
}
