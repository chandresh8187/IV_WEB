import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Link } from "react-router";
import { hasAccess } from "../utils/access";
import { maintenanceOverview } from "../api/maintenanceApi";
import "../screens/MaintenanceScreen.css";
export default function MaintenanceReminder() {
  const user = useSelector((s) => s.auth.user),
    enabled = hasAccess(user, "unit1.maintenance.view");
  const { data } = useQuery({
    queryKey: ["unit1-maintenance", "overview"],
    queryFn: maintenanceOverview,
    enabled,
    refetchInterval: 60000,
  });
  if (!enabled || !data) return null;
  const { overdue, due_today, due_soon, unscheduled, under_maintenance = 0 } = data.summary;
  if (!(overdue + due_today + due_soon + unscheduled + under_maintenance)) return null;
  return (
    <aside className="maintenance-reminder">
      <div>
        <strong>Machine maintenance</strong>
        <p>
          {under_maintenance} under maintenance · {overdue} overdue · {due_today} due today · {due_soon} due soon
          {unscheduled ? ` · ${unscheduled} machines need a schedule` : ""}
        </p>
      </div>
      <Link to="/production/maintenance">Open maintenance</Link>
    </aside>
  );
}
