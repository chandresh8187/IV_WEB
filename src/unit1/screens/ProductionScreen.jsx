import {
  Box,
  Boxes,
  ClipboardList,
  History,
  Factory,
  Wrench,
} from "lucide-react";
import ModuleMenu from "../components/ModuleMenu";
import { useSelector } from "react-redux";
import { hasAccess } from "../utils/access";

const actions = [
  {
    title: "Live Production",
    description: "See roll forming machines, coil runs, and produced pieces.",
    path: "/production/live",
    icon: Factory,
    primary: true,
  },
  {
    title: "Material Stock",
    description: "View finished material stock and dispatches.",
    path: "/production/material-stock",
    icon: Boxes,
  },
  {
    title: "Coil Stock",
    description: "View received coils and add a new inward entry.",
    path: "/coils",
    icon: Boxes,
  },
  {
    title: "Live Inspections",
    description: "Review current-shift material inspections across machines.",
    path: "/production/live-inspections",
    icon: ClipboardList,
  },
  {
    title: "Production Planning",
    description: "Plan material quantities for each party and machine.",
    path: "/production/planning",
    icon: ClipboardList,
  },
  {
    title: "Job Cards",
    description: "Plan members, allowed coils and hole positions.",
    path: "/production/job-cards",
    icon: ClipboardList,
  },
  {
    title: "Maintenance",
    description: "Record machine breakdowns and completed repairs.",
    path: "/production/maintenance",
    icon: Wrench,
  },

  {
    title: "3D Material Viewer",
    description: "Preview section profiles and punch positions in 3D.",
    path: "/production/material-viewer",
    icon: Box,
  },

  {
    title: "Production History",
    description: "Review production dates, shifts, materials and job cards.",
    path: "/production/history",
    icon: History,
  },
];

export default function ProductionScreen() {
  const user = useSelector((state) => state.auth.user);
  const visible = actions.filter(
    (item) =>
      !(
        user?.role === "labour" &&
        !["/production/live", "/production/maintenance"].includes(item.path)
      ) &&
      hasAccess(
        user,
        item.path === "/production/maintenance"
          ? "unit1.maintenance.view"
          : item.path === "/production/material-stock"
            ? "unit1.material-stock.view"
          : item.path === "/coils"
            ? "unit1.coils.view"


              : "unit1.production.view",
      ),
  );
  return (
    <ModuleMenu
      eyebrow="IV / PLANT OPERATIONS"
      title="Production"
      description="Plan, record and review your roll-forming operations."
      searchable
      sections={[
        {title:'Production', paths:['/production/live','/production/live-inspections','/production/planning','/production/job-cards']},
        {title:'Stock & Plant', paths:['/coils','/production/material-stock','/production/maintenance']},
        {title:'Reports & Quality', paths:['/production/history','/production/material-viewer']},
      ]}
      actions={visible}
    />
  );
}
