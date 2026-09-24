const ROLE_DEFAULTS = {
  "chat.view": ["superadmin", "plant_manager", "admin", "supervisor"],
  "zinc_stock.view": ["superadmin", "plant_manager", "admin"],
  "zinc_stock.receive": ["superadmin", "plant_manager"],
  "zinc_stock.transfer": ["superadmin", "plant_manager", "supervisor"],
  "zinc_stock.adjust": ["superadmin", "plant_manager"],
  "zinc_stock.report": ["superadmin", "plant_manager", "admin"],
  "zinc_byproduct.manage": ["superadmin", "plant_manager"],
  "expense_report.view": ["superadmin", "plant_manager", "admin"],
  "expense_report.settings": ["superadmin", "plant_manager"],
  "expense_report.report": ["superadmin", "plant_manager", "admin"],
  "monthly_reports.view": ["superadmin", "plant_manager", "admin"],
  "monthly_reports.report": ["superadmin", "plant_manager", "admin"],
  "chemical_checks.view": ["superadmin", "plant_manager", "admin", "supervisor"],
  "chemical_checks.manage": ["superadmin", "plant_manager", "supervisor"],
  "chemical_checks.report": ["superadmin", "plant_manager", "admin"],
  "rate_calculator.view": ["superadmin", "plant_manager", "admin"],
  "contractors.view": ["superadmin", "plant_manager", "admin"],
  "contractors.manage": ["superadmin", "plant_manager"],
  "dashboard.view": ["superadmin", "plant_manager", "admin"],
  "production.view": ["superadmin", "plant_manager", "admin", "supervisor"],
  "production.save": ["superadmin", "plant_manager", "supervisor"],
  "production.grant_edit": ["superadmin"],
  "production.manage_all": ["superadmin"],
  "shifts.view": ["superadmin", "plant_manager", "admin", "supervisor"],
  "shifts.correct": ["superadmin", "plant_manager"],
  "history.view": ["superadmin", "plant_manager", "admin", "supervisor"],
  "reports.generate": ["superadmin"],
  "planning.view": ["superadmin", "plant_manager", "admin"],
  "planning.manage": ["superadmin", "plant_manager", "admin"],
  "certificates.view": ["superadmin", "admin"],
  "certificates.generate": ["superadmin", "admin"],
  "users.view": ["superadmin", "plant_manager", "admin"],
  "users.manage": ["superadmin"],
  "plant.view": ["superadmin", "plant_manager", "admin"],
  "plant.manage": ["superadmin", "plant_manager"],
  "items.manage": ["superadmin", "plant_manager"],
  "financial_years.manage": ["superadmin"],
  "settings.manage": ["superadmin"],
  "app_updates.manage": ["superadmin"],
};

export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
};

export const hasPermission = (user, key) => {
  const role = String(user?.role || "").toLowerCase().trim();
  if (role === "superadmin") return true;
  if (Array.isArray(user?.permissions)) return user.permissions.includes(key);
  return Boolean(ROLE_DEFAULTS[key]?.includes(role));
};
