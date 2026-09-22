import { CalendarRange, HardHat, PackageOpen, ShieldCheck, SlidersHorizontal } from "lucide-react";
import ModuleMenu from "../../components/ModuleMenu";
import { getStoredUser, hasPermission } from "../../utils/permissions";

export default function SettingsMenuScreen(){
  const user=getStoredUser();
  const role=String(user?.role||"").toLowerCase();
  const actions=[
    {title:"User Access",icon:ShieldCheck,path:"/settings/user-access",description:"Manage users and decide which operations each user can perform.",show:role==="superadmin"},
    {title:"Contractors",icon:HardHat,path:"/settings/contractors",description:"Add contractors and browse the contractor list.",show:hasPermission(user,"contractors.manage")},
    {title:"Items",icon:PackageOpen,path:"/settings/items",description:"Material catalogue and production item definitions.",show:hasPermission(user,"items.manage")},
    {title:"Financial Year",icon:CalendarRange,path:"/settings/financial-years",description:"Accounting periods and financial year records.",show:hasPermission(user,"financial_years.manage")},
    {title:"Control Panel",icon:SlidersHorizontal,path:"/settings/control-panel",description:"Shift rules, app releases and system configuration.",show:hasPermission(user,"settings.manage")||hasPermission(user,"app_updates.manage")},
  ].filter(item=>item.show);
  return <ModuleMenu kind="settings" eyebrow="SYSTEM ADMINISTRATION" title="Settings" description="Master records, access controls and system configuration." actions={actions}/>;
}
