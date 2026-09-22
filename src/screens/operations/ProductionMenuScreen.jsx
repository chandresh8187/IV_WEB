import { Calculator, ClipboardList, Clock3, Factory, FileCheck2, Gauge, HardHat, History, PackageOpen, Receipt } from "lucide-react";
import ModuleMenu from "../../components/ModuleMenu";
import { getStoredUser, hasPermission } from "../../utils/permissions";

export default function ProductionMenuScreen(){
  const user=getStoredUser();
  const allowed=(permission)=>hasPermission(user,permission);
  const actions=[
    {title:"Live Production",icon:Factory,path:"/production/live",description:"Record output, review readings and correct shift entries.",primary:true,show:allowed("production.view")},
    {title:"Production Planning",icon:ClipboardList,path:"/production/planning",description:"Manage challans, materials and production targets.",show:allowed("planning.view")},
    {title:"Production History",icon:History,path:"/production/history",description:"Review day and night shifts, materials and planning.",show:allowed("history.view")},
    {title:"Rate Calculator",icon:Calculator,path:"/production/rate-calculator",description:"Calculate zinc cost and final production rate per kg.",show:allowed("rate_calculator.view")},
    {title:"Contract Production",icon:HardHat,path:"/production/contract-production",description:"Review monthly production totals for each contractor.",show:allowed("contractors.view")},
    {title:"Expense Report",icon:Receipt,path:"/production/expenses",description:"Review monthly production costs and running plant cost.",show:allowed("expense_report.view")},
    {title:"Monthly Reports",icon:ClipboardList,path:"/production/monthly-reports",description:"View and export complete reports for previous months.",show:allowed("monthly_reports.view")},
    {title:"Zinc Stock",icon:PackageOpen,path:"/production/zinc-stock",description:"Track zinc in the plant and kettle tank.",show:allowed("zinc_stock.view")},
    {title:"Shift Status",icon:Clock3,path:"/production/shift",description:"Check shift status, start times and handover.",show:allowed("shifts.view")},
    {title:"Test Certificate",icon:FileCheck2,path:"/production/certificates",description:"Generate coating certificates from production readings.",show:allowed("certificates.view")},
    {title:"Plant Control",icon:Gauge,path:"/production/plant",description:"Manage running, stopped and maintenance status.",show:allowed("plant.view")},
  ].filter(x=>x.show);
  return <ModuleMenu eyebrow="IV / PLANT OPERATIONS" title="Production" description="Plan, record and review your galvanizing operations." actions={actions}/>;
}
