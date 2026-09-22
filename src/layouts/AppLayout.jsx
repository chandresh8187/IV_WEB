import { ArrowLeft, CalendarDays, Factory, LayoutDashboard, LogOut, Menu, Settings2, UserCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { getMyAccessApi, logoutApi } from "../api/authApi";
import socket from "../socket/socket";
import { hasPermission } from "../utils/permissions";
import "./AppLayout.css";

const titles={"/dashboard":"Dashboard","/production":"Production","/production/live":"Live Production","/production/planning":"Production Planning","/production/history":"Production History","/production/rate-calculator":"Rate Calculator","/production/contract-production":"Contract Production","/production/expenses":"Expense Report","/production/monthly-reports":"Monthly Reports","/production/zinc-stock":"Zinc Stock","/production/shift":"Shift Status","/production/certificates":"Test Certificate","/production/plant":"Plant Control","/settings":"Settings","/settings/items":"Items","/settings/contractors":"Contractors","/settings/financial-years":"Financial Year","/settings/user-access":"User Access","/settings/control-panel":"Control Panel","/profile":"Profile"};
const getUser=()=>{try{return JSON.parse(localStorage.getItem("user")||"null")}catch{return null}};
const roleName=value=>String(value||"").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
const initials=value=>String(value||"IV").split(" ").filter(Boolean).map(x=>x[0]).slice(0,2).join("").toUpperCase();

export default function AppLayout(){
  const navigate=useNavigate(),location=useLocation();
  const [mobileOpen,setMobileOpen]=useState(false),[connected,setConnected]=useState(socket.connected),[,refresh]=useState(0);
  const user=getUser(),role=String(user?.role||"").toLowerCase();
  const showSettings=["contractors.manage","items.manage","financial_years.manage","settings.manage","app_updates.manage"].some(key=>hasPermission(user,key));
  const productionKeys=["production.view","planning.view","history.view","rate_calculator.view","contractors.view","expense_report.view","monthly_reports.view","zinc_stock.view","shifts.view","certificates.view","plant.view"];
  const nav=[{path:"/dashboard",label:"Dashboard",icon:LayoutDashboard,show:hasPermission(user,"dashboard.view")},{path:"/production",label:"Production",icon:Factory,show:productionKeys.some(key=>hasPermission(user,key))},{path:"/settings",label:"Settings",icon:Settings2,show:showSettings},{path:"/profile",label:"Profile",icon:UserCircle2,show:true}].filter(x=>x.show);
  const productionActive=location.pathname.startsWith("/production"),settingsActive=location.pathname.startsWith("/settings");
  const parentPath=location.pathname.startsWith("/production/")?"/production":location.pathname.startsWith("/settings/")?"/settings":["/production","/settings","/profile"].includes(location.pathname)&&role!=="supervisor"?"/dashboard":null;
  useEffect(()=>{const fn=()=>refresh(v=>v+1);window.addEventListener("storage",fn);window.addEventListener("iv:session-changed",fn);return()=>{window.removeEventListener("storage",fn);window.removeEventListener("iv:session-changed",fn)}},[]);
  useEffect(()=>{const yes=()=>setConnected(true),no=()=>setConnected(false);socket.on("connect",yes);socket.on("disconnect",no);socket.on("connect_error",no);if(!socket.connected)socket.connect();return()=>{socket.off("connect",yes);socket.off("disconnect",no);socket.off("connect_error",no)}},[]);
  useEffect(()=>{
    let active=true;
    const syncAccess=async()=>{try{const response=await getMyAccessApi();if(!active)return;const stored=getUser();if(!stored)return;const next={...stored,role:response?.data?.user?.role||stored.role,assigned_shift:response?.data?.user?.assigned_shift??stored.assigned_shift,permissions:response?.data?.allowedKeys||[]};localStorage.setItem("user",JSON.stringify(next));window.dispatchEvent(new Event("iv:session-changed"));}catch{/* Keep the last known access while temporarily offline. */}};
    const permissionsUpdated=event=>{if(Number(event?.user_id)===Number(user?.id))syncAccess()};
    const usersUpdated=event=>{if(Number(event?.user_id)===Number(user?.id)&&event?.action==="permissions_changed")syncAccess()};
    socket.on("user_permissions_updated",permissionsUpdated);socket.on("users_updated",usersUpdated);socket.on("connect",syncAccess);syncAccess();
    return()=>{active=false;socket.off("user_permissions_updated",permissionsUpdated);socket.off("users_updated",usersUpdated);socket.off("connect",syncAccess)};
  },[user?.id]);
  useEffect(()=>setMobileOpen(false),[location.pathname]);
  useEffect(()=>{if(!mobileOpen)return;const old=document.body.style.overflow,esc=e=>e.key==="Escape"&&setMobileOpen(false);document.body.style.overflow="hidden";window.addEventListener("keydown",esc);return()=>{document.body.style.overflow=old;window.removeEventListener("keydown",esc)}},[mobileOpen]);
  const logout=()=>{socket.disconnect();logoutApi();navigate("/login",{replace:true})};
  return <div className="application-shell">
    {mobileOpen?<button className="sidebar-backdrop" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"/>:null}
    <aside className={`app-sidebar${mobileOpen?" mobile-open":""}`}>
      <div className="sidebar-brand"><img src="/iv-logo.png" alt="IV Square Structure"/><div><strong>IV APP</strong><span>Production Management</span></div><button className="sidebar-close" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"><X size={20}/></button></div>
      <div className="sidebar-section-label">Workspace</div>
      <nav className="sidebar-navigation">{nav.map(({path,label,icon:Icon})=><NavLink key={path} to={path} end={path==="/dashboard"||path==="/profile"} className={({isActive})=>isActive||(path==="/production"&&productionActive)||(path==="/settings"&&settingsActive)?"sidebar-link active":"sidebar-link"}><Icon size={20} strokeWidth={1.8}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className={`backend-status ${connected?"connected":"disconnected"}`}><span className="backend-dot"/><div><strong>{connected?"Backend connected":"Reconnecting…"}</strong><small>{connected?"Live updates active":"Updates temporarily offline"}</small></div></div><div className="sidebar-profile"><div className="sidebar-avatar">{initials(user?.name)}</div><div className="sidebar-user-details"><strong>{user?.name}</strong><small>{roleName(user?.role)}</small></div><button className="sidebar-logout" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={18}/></button></div></div>
    </aside>
    <div className="application-main"><header className="application-header"><div className="header-title-area"><button className="mobile-menu-button" onClick={()=>setMobileOpen(true)} aria-label="Open navigation"><Menu size={22}/></button>{parentPath?<button className="header-back-button" onClick={()=>navigate(parentPath)} aria-label={`Back to ${titles[parentPath]||"parent screen"}`} title={`Back to ${titles[parentPath]||"parent screen"}`}><ArrowLeft size={20}/></button>:null}<div><span>IV Square Structure</span><h1>{titles[location.pathname]||"IV APP"}</h1></div></div><div className="header-right"><div className={`header-live-status ${connected?"connected":"disconnected"}`}><span/>{connected?"Live":"Offline"}</div><div className="header-date"><CalendarDays size={17}/>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div><div className="header-user"><div className="header-avatar">{initials(user?.name)}</div><span><strong>{user?.name}</strong><small>{roleName(user?.role)}</small></span></div></div></header><main className="application-content"><Outlet/></main></div>
  </div>;
}
