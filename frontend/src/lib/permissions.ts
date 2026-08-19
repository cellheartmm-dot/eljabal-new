export interface ModulePermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export type AppModules =
  | "dashboard"
  | "projects"
  | "projectExpenses"
  | "revenues"
  | "employees"
  | "subcontractors"
  | "subcontractorInvoices"
  | "equipment"
  | "generalExpenses"
  | "termSheets"
  | "priceQuotations"
  | "reports"
  | "settings";

export type PermissionsMatrix = Record<AppModules, ModulePermissions>;

export interface ModuleConfig {
  key: AppModules;
  label: string;
  icon: string;
  route: string;
  description: string;
}

export const MODULES_CONFIG: ModuleConfig[] = [
  { key: "dashboard", label: "لوحة التحكم", icon: "📊", route: "/", description: "نظرة عامة والإحصائيات" },
  { key: "projects", label: "المشاريع", icon: "🏗️", route: "/projects", description: "إدارة المشروعات ونماذج المباني" },
  { key: "projectExpenses", label: "مصروفات المشرفين والموقع", icon: "💸", route: "/project-expenses", description: "مصروفات الموقع والعهد واعتمادها" },
  { key: "revenues", label: "الإيرادات والتحصيلات", icon: "💰", route: "/revenues", description: "إيرادات العملاء والتحصيلات" },
  { key: "employees", label: "إدارة الموظفين (HR)", icon: "👥", route: "/employees", description: "الموظفون وسجلات اليوميات والسلف" },
  { key: "subcontractors", label: "المقاولون الفرعيون", icon: "🤝", route: "/subcontractors", description: "مقاولو الباطن وطواقم العمل" },
  { key: "subcontractorInvoices", label: "مستخلصات المقاولين", icon: "📑", route: "/subcontractor-invoices", description: "مستخلصات وحسابات مقاولي الباطن" },
  { key: "equipment", label: "المعدات والآليات", icon: "🚛", route: "/equipment", description: "سجل التشغيل ووقود وصيانة المعدات" },
  { key: "generalExpenses", label: "المصروفات العامة والإدارية", icon: "🧾", route: "/general-expenses", description: "إيجارات المقرات والعهد الإدارية" },
  { key: "termSheets", label: "مذكرات الاستثمار", icon: "📈", route: "/term-sheets", description: "مذكرات شروط الأراضي وحصص الشركاء" },
  { key: "priceQuotations", label: "عروض الأسعار والمقايسات (BOQ)", icon: "📑", route: "/price-quotations", description: "مقايسات بنود الأعمال المسعرة" },
  { key: "reports", label: "التقارير والمركز المالي", icon: "📑", route: "/reports", description: "الحسابات الشاملة وقوائم الأرباح والخسائر" },
  { key: "settings", label: "إعدادات النظام والمستخدمين", icon: "⚙️", route: "/settings", description: "بيانات الشركة، المستخدمين، والصلاحيات" },
];

export const EMPTY_PERMISSIONS: PermissionsMatrix = {
  dashboard: { view: true, add: false, edit: false, delete: false },
  projects: { view: false, add: false, edit: false, delete: false },
  projectExpenses: { view: false, add: false, edit: false, delete: false },
  revenues: { view: false, add: false, edit: false, delete: false },
  employees: { view: false, add: false, edit: false, delete: false },
  subcontractors: { view: false, add: false, edit: false, delete: false },
  subcontractorInvoices: { view: false, add: false, edit: false, delete: false },
  equipment: { view: false, add: false, edit: false, delete: false },
  generalExpenses: { view: false, add: false, edit: false, delete: false },
  termSheets: { view: false, add: false, edit: false, delete: false },
  priceQuotations: { view: false, add: false, edit: false, delete: false },
  reports: { view: false, add: false, edit: false, delete: false },
  settings: { view: false, add: false, edit: false, delete: false },
};

export const FULL_ADMIN_PERMISSIONS: PermissionsMatrix = {
  dashboard: { view: true, add: true, edit: true, delete: true },
  projects: { view: true, add: true, edit: true, delete: true },
  projectExpenses: { view: true, add: true, edit: true, delete: true },
  revenues: { view: true, add: true, edit: true, delete: true },
  employees: { view: true, add: true, edit: true, delete: true },
  subcontractors: { view: true, add: true, edit: true, delete: true },
  subcontractorInvoices: { view: true, add: true, edit: true, delete: true },
  equipment: { view: true, add: true, edit: true, delete: true },
  generalExpenses: { view: true, add: true, edit: true, delete: true },
  termSheets: { view: true, add: true, edit: true, delete: true },
  priceQuotations: { view: true, add: true, edit: true, delete: true },
  reports: { view: true, add: true, edit: true, delete: true },
  settings: { view: true, add: true, edit: true, delete: true },
};

// Generate default preset templates
export function getDefaultPermissionsForRole(roleName: string): PermissionsMatrix {
  const r = (roleName || "").toLowerCase();

  // 1. Admin
  if (r.includes("مدير") || r === "admin" || r.includes("كامل")) {
    return JSON.parse(JSON.stringify(FULL_ADMIN_PERMISSIONS));
  }

  // 2. Accountant
  if (r.includes("محاسب") || r === "accountant" || r.includes("مالي")) {
    return {
      dashboard: { view: true, add: false, edit: false, delete: false },
      projects: { view: true, add: false, edit: false, delete: false },
      projectExpenses: { view: true, add: true, edit: true, delete: true },
      revenues: { view: true, add: true, edit: true, delete: true },
      employees: { view: true, add: true, edit: true, delete: false },
      subcontractors: { view: true, add: true, edit: true, delete: false },
      subcontractorInvoices: { view: true, add: true, edit: true, delete: true },
      equipment: { view: true, add: true, edit: true, delete: false },
      generalExpenses: { view: true, add: true, edit: true, delete: true },
      termSheets: { view: false, add: false, edit: false, delete: false },
      priceQuotations: { view: true, add: true, edit: true, delete: true },
      reports: { view: true, add: false, edit: false, delete: false },
      settings: { view: false, add: false, edit: false, delete: false },
    };
  }

  // 3. Site Supervisor
  if (r.includes("مشرف") || r === "supervisor" || r.includes("ميداني")) {
    return {
      dashboard: { view: true, add: false, edit: false, delete: false },
      projects: { view: true, add: false, edit: false, delete: false },
      projectExpenses: { view: true, add: true, edit: true, delete: false },
      revenues: { view: false, add: false, edit: false, delete: false },
      employees: { view: true, add: true, edit: true, delete: false }, // Dailies attendance
      subcontractors: { view: true, add: true, edit: false, delete: false }, // Crew attendance
      subcontractorInvoices: { view: false, add: false, edit: false, delete: false },
      equipment: { view: true, add: true, edit: false, delete: false },
      generalExpenses: { view: false, add: false, edit: false, delete: false },
      termSheets: { view: false, add: false, edit: false, delete: false },
      priceQuotations: { view: false, add: false, edit: false, delete: false },
      reports: { view: false, add: false, edit: false, delete: false },
      settings: { view: false, add: false, edit: false, delete: false },
    };
  }

  // 4. Technical Office / Quantity Surveyor Engineer
  if (r.includes("مهندس") || r.includes("حصر") || r.includes("مكتب فني")) {
    return {
      dashboard: { view: true, add: false, edit: false, delete: false },
      projects: { view: true, add: true, edit: true, delete: false },
      projectExpenses: { view: false, add: false, edit: false, delete: false },
      revenues: { view: false, add: false, edit: false, delete: false },
      employees: { view: false, add: false, edit: false, delete: false },
      subcontractors: { view: true, add: true, edit: true, delete: false },
      subcontractorInvoices: { view: true, add: true, edit: true, delete: false },
      equipment: { view: true, add: false, edit: false, delete: false },
      generalExpenses: { view: false, add: false, edit: false, delete: false },
      termSheets: { view: true, add: true, edit: true, delete: false },
      priceQuotations: { view: true, add: true, edit: true, delete: false },
      reports: { view: false, add: false, edit: false, delete: false },
      settings: { view: false, add: false, edit: false, delete: false },
    };
  }

  // 5. HR Officer
  if (r.includes("شؤون") || r.includes("hr") || r.includes("موارد")) {
    return {
      dashboard: { view: true, add: false, edit: false, delete: false },
      projects: { view: false, add: false, edit: false, delete: false },
      projectExpenses: { view: false, add: false, edit: false, delete: false },
      revenues: { view: false, add: false, edit: false, delete: false },
      employees: { view: true, add: true, edit: true, delete: true },
      subcontractors: { view: false, add: false, edit: false, delete: false },
      subcontractorInvoices: { view: false, add: false, edit: false, delete: false },
      equipment: { view: false, add: false, edit: false, delete: false },
      generalExpenses: { view: false, add: false, edit: false, delete: false },
      termSheets: { view: false, add: false, edit: false, delete: false },
      priceQuotations: { view: false, add: false, edit: false, delete: false },
      reports: { view: false, add: false, edit: false, delete: false },
      settings: { view: false, add: false, edit: false, delete: false },
    };
  }

  // 6. Read-Only Viewer
  if (r.includes("قراءة") || r.includes("مراجع") || r.includes("view")) {
    return {
      dashboard: { view: true, add: false, edit: false, delete: false },
      projects: { view: true, add: false, edit: false, delete: false },
      projectExpenses: { view: true, add: false, edit: false, delete: false },
      revenues: { view: true, add: false, edit: false, delete: false },
      employees: { view: true, add: false, edit: false, delete: false },
      subcontractors: { view: true, add: false, edit: false, delete: false },
      subcontractorInvoices: { view: true, add: false, edit: false, delete: false },
      equipment: { view: true, add: false, edit: false, delete: false },
      generalExpenses: { view: true, add: false, edit: false, delete: false },
      termSheets: { view: true, add: false, edit: false, delete: false },
      priceQuotations: { view: true, add: false, edit: false, delete: false },
      reports: { view: true, add: false, edit: false, delete: false },
      settings: { view: false, add: false, edit: false, delete: false },
    };
  }

  // Fallback
  return JSON.parse(JSON.stringify(EMPTY_PERMISSIONS));
}

// Check action permission (view, add, edit, delete)
export function hasPermission(
  user: any,
  moduleKey: AppModules,
  action: "view" | "add" | "edit" | "delete"
): boolean {
  if (!user) return false;

  // Admin has absolute permission
  if (user.username === "admin" || (user.role && (user.role.includes("مدير") || user.role === "admin"))) {
    return true;
  }

  // If user has specific permissions matrix
  if (user.permissions && user.permissions[moduleKey]) {
    return Boolean(user.permissions[moduleKey][action]);
  }

  // Derive from role default
  const defaultMatrix = getDefaultPermissionsForRole(user.role);
  if (defaultMatrix && defaultMatrix[moduleKey]) {
    // Backwards compatibility with legacy boolean flags
    if (moduleKey === "projectExpenses" && user.canRecordExpenses !== undefined) {
      if (action === "add" || action === "edit") return Boolean(user.canRecordExpenses);
    }
    if (moduleKey === "employees" && user.canRecordWorkerDaily !== undefined) {
      if (action === "view" || action === "add") return Boolean(user.canRecordWorkerDaily);
    }
    if (moduleKey === "subcontractors" && user.canRecordSubcontractorDaily !== undefined) {
      if (action === "view" || action === "add") return Boolean(user.canRecordSubcontractorDaily);
    }

    return Boolean(defaultMatrix[moduleKey][action]);
  }

  return false;
}

// Map route to moduleKey
export function getModuleKeyForRoute(route: string): AppModules {
  if (route === "/" || route === "") return "dashboard";
  if (route.startsWith("/projects")) return "projects";
  if (route.startsWith("/project-expenses")) return "projectExpenses";
  if (route.startsWith("/revenues")) return "revenues";
  if (route.startsWith("/employees") || route.startsWith("/workers") || route.startsWith("/worker-")) return "employees";
  if (route.startsWith("/subcontractors")) return "subcontractors";
  if (route.startsWith("/subcontractor-invoices")) return "subcontractorInvoices";
  if (route.startsWith("/equipment")) return "equipment";
  if (route.startsWith("/general-expenses")) return "generalExpenses";
  if (route.startsWith("/term-sheets")) return "termSheets";
  if (route.startsWith("/price-quotations")) return "priceQuotations";
  if (route.startsWith("/reports")) return "reports";
  if (route.startsWith("/settings")) return "settings";
  return "dashboard";
}

// Check if user can view route
export function canUserViewRoute(user: any, route: string): boolean {
  const modKey = getModuleKeyForRoute(route);
  return hasPermission(user, modKey, "view");
}
