export const statusLabels = {
  in_progress: "Under maintenance",
  overdue: "Overdue",
  due_today: "Due today",
  due_soon: "Due soon",
  upcoming: "Upcoming",
  paused: "Paused",
};
export const requestKey = () =>
  `maint_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
export const newPlan = (machine) => ({
  machine_id: machine || "",
  title: "",
  interval_days: "30",
  first_due_date: "",
  remind_before_days: "3",
  priority: "normal",
  instructions: "",
  is_active: true,
  request_key: requestKey(),
});
export const newRecord = (plan) => ({
  machine_id: plan?.machine_id || "",
  plan_id: plan?.id || "",
  service_date: "",
  maintenance_type: "preventive",
  technician: "",
  work_done: "",
  parts_used: "",
  cost: "",
  downtime_minutes: "",
  notes: "",
  request_key: requestKey(),
});
export const planFields = [
  ["title", "Maintenance task", "text", true],
  ["first_due_date", "First due date", "date", true],
  ["interval_days", "Repeat every (days)", "number", true],
  ["remind_before_days", "Remind before (days)", "number", true],
  ["instructions", "Instructions", "textarea", false],
];
export const recordFields = [
  ["service_date", "Actual service date", "date", true],
  ["technician", "Technician / service provider", "text", true],
  ["work_done", "Work completed", "textarea", true],
  ["parts_used", "Parts used", "textarea", false],
  ["cost", "Actual cost (INR, optional)", "number", false],
  ["downtime_minutes", "Actual downtime (minutes, optional)", "number", false],
  ["notes", "Notes", "textarea", false],
];
export const errorMessage = (error) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  "Unable to complete maintenance request.";
