import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Project {
  id: string;
  name: string;
  code: string;
  value?: number;
}

interface MasterTransaction {
  id: string;
  date: string;
  type: string; // "إيراد", "مصروف موقع", "يومية عمال", "سلفة عامل", "راتب مشرف", "مستخلص مقاول", "وقود معدة", "مصروف عام"
  categoryBadge: string;
  isIncome: boolean;
  amount: number;
  description: string;
  projectName: string;
  projectId?: string | null;
  supervisorName?: string;
}

export default function ReportsPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"statement" | "transactions">("statement");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); // "all" or "YYYY-MM"
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Financial Ledger Data Streams
  const [revenuesList, setRevenuesList] = useState<any[]>([]);
  const [projectExpensesList, setProjectExpensesList] = useState<any[]>([]);
  const [workerDailiesList, setWorkerDailiesList] = useState<any[]>([]);
  const [workerAdvancesList, setWorkerAdvancesList] = useState<any[]>([]);
  const [supervisorSalariesList, setSupervisorSalariesList] = useState<any[]>([]);
  const [supervisorDailiesList, setSupervisorDailiesList] = useState<any[]>([]);
  const [subcontractorDocsList, setSubcontractorDocsList] = useState<any[]>([]);
  const [equipmentExpensesList, setEquipmentExpensesList] = useState<any[]>([]);
  const [generalExpensesList, setGeneralExpensesList] = useState<any[]>([]);

  const fetchAllFinancialData = async () => {
    setLoading(true);
    try {
      const [
        pRes,
        revRes,
        pExpRes,
        wDailyRes,
        wAdvRes,
        supSalRes,
        supDailyRes,
        subDocRes,
        eqExpRes,
        genExpRes,
      ] = await Promise.all([
        supabase.from("Project").select("id, name, code, value").order("name", { ascending: true }),
        supabase.from("Revenue").select("*, project:Project(name)"),
        supabase.from("ProjectExpense").select("*, project:Project(name)"),
        supabase.from("WorkerDaily").select("*, worker:Worker(name), project:Project(name)"),
        supabase.from("WorkerAdvance").select("*, worker:Worker(name), project:Project(name)"),
        supabase.from("SupervisorSalary").select("*, supervisor:Supervisor(name), project:Project(name)"),
        supabase.from("SupervisorDaily").select("*, supervisor:Supervisor(name), project:Project(name)"),
        supabase.from("SubcontractorDoc").select("*, subcontractor:Subcontractor(name), project:Project(name)"),
        supabase.from("EquipmentExpense").select("*, equipment:Equipment(name)"),
        supabase.from("GeneralExpense").select("*"),
      ]);

      if (pRes.data) setProjects(pRes.data);
      if (revRes.data) setRevenuesList(revRes.data);
      if (pExpRes.data) setProjectExpensesList(pExpRes.data);
      if (wDailyRes.data) setWorkerDailiesList(wDailyRes.data);
      if (wAdvRes.data) setWorkerAdvancesList(wAdvRes.data);
      if (supSalRes.data) setSupervisorSalariesList(supSalRes.data);
      if (supDailyRes.data) setSupervisorDailiesList(supDailyRes.data);
      if (subDocRes.data) setSubcontractorDocsList(subDocRes.data);
      if (eqExpRes.data) setEquipmentExpensesList(eqExpRes.data);
      if (genExpRes.data) setGeneralExpensesList(genExpRes.data);

    } catch (e: any) {
      showToast(e.message || "فشل في تحميل بيانات المركز المالي والحسابات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFinancialData();
  }, []);

  // Helper filter by month
  const isMonthMatch = (itemDateStr?: string) => {
    if (selectedMonth === "all" || !itemDateStr) return true;
    try {
      const itemM = new Date(itemDateStr).toISOString().substring(0, 7);
      return itemM === selectedMonth;
    } catch (e) {
      return true;
    }
  };

  // Helper filter by project
  const isProjectMatch = (itemProjectId?: string | null) => {
    if (selectedProjectId === "all") return true;
    return itemProjectId === selectedProjectId;
  };

  // --- CALCULATION OF FINANCIAL METRICS ---

  // 1. Total Revenues & Inflows
  const filteredRevenues = revenuesList.filter((r) => isProjectMatch(r.projectId) && isMonthMatch(r.date));
  const totalRevenuesAmount = filteredRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

  // 2. Project Expenses (Materials, site equipment, direct site costs)
  const filteredProjectExpenses = projectExpensesList.filter((pe) => isProjectMatch(pe.projectId) && isMonthMatch(pe.date || pe.createdAt));
  const totalProjectExpensesAmount = filteredProjectExpenses.reduce((sum, pe) => sum + (pe.amount || 0), 0);

  // 3. Worker Labor Dailies & Advances
  const filteredWorkerDailies = workerDailiesList.filter((wd) => isProjectMatch(wd.projectId) && isMonthMatch(wd.date));
  const totalWorkerDailiesAmount = filteredWorkerDailies.reduce((sum, wd) => sum + (wd.amount || 0), 0);

  const filteredWorkerAdvances = workerAdvancesList.filter((wa) => isProjectMatch(wa.projectId) && isMonthMatch(wa.date));
  const totalWorkerAdvancesAmount = filteredWorkerAdvances.reduce((sum, wa) => sum + (wa.amount || 0), 0);
  const totalLaborCosts = totalWorkerDailiesAmount + totalWorkerAdvancesAmount;

  // 4. Supervisors Salaries & Dailies
  const filteredSupSalaries = supervisorSalariesList.filter((ss) => isProjectMatch(ss.projectId) && isMonthMatch(ss.date || ss.createdAt));
  const totalSupSalariesAmount = filteredSupSalaries.reduce((sum, ss) => sum + (ss.amount || 0), 0);

  const filteredSupDailies = supervisorDailiesList.filter((sd) => isProjectMatch(sd.projectId) && isMonthMatch(sd.date));
  const totalSupDailiesAmount = filteredSupDailies.reduce((sum, sd) => sum + (sd.amount || 0), 0);
  const totalSupervisorCosts = totalSupSalariesAmount + totalSupDailiesAmount;

  // 5. Subcontractor Statements & Payments
  const filteredSubDocs = subcontractorDocsList.filter((sd) => isProjectMatch(sd.projectId) && isMonthMatch(sd.date));
  const totalSubcontractorCosts = filteredSubDocs.reduce((sum, sd) => sum + (sd.amount || 0), 0);

  // 6. Equipment Fuel & Operating Expenses
  const filteredEquipmentExpenses = equipmentExpensesList.filter((ee) => {
    let projId = "";
    if (ee.notes && ee.notes.includes("projectId=")) {
      const pm = ee.notes.match(/projectId=([^\|\]]+)/);
      if (pm) projId = pm[1];
    }
    return isProjectMatch(projId) && isMonthMatch(ee.date);
  });
  const totalEquipmentCosts = filteredEquipmentExpenses.reduce((sum, ee) => sum + (ee.amount || 0), 0);

  // 7. General Administrative Expenses (H.Q.)
  const filteredGeneralExpenses = generalExpensesList.filter((ge) => {
    let projId = "";
    if (ge.notes && ge.notes.includes("targetId=")) {
      const tm = ge.notes.match(/targetId=([^\|\]]+)/);
      if (tm) projId = tm[1];
    }
    return isProjectMatch(projId) && isMonthMatch(ge.date);
  });
  const totalGeneralExpensesAmount = filteredGeneralExpenses.reduce((sum, ge) => sum + (ge.amount || 0), 0);

  // TOTAL OUTFLOWS & EXPENSES
  const totalOverallExpenses =
    totalProjectExpensesAmount +
    totalLaborCosts +
    totalSupervisorCosts +
    totalSubcontractorCosts +
    totalEquipmentCosts +
    totalGeneralExpensesAmount;

  // NET PROFIT OR LOSS
  const netProfitOrLoss = totalRevenuesAmount - totalOverallExpenses;
  const isLoss = netProfitOrLoss < 0;

  // Helper percentage calculator
  const calcPercent = (val: number) => {
    if (!totalOverallExpenses || totalOverallExpenses === 0) return "0.0%";
    return ((val / totalOverallExpenses) * 100).toFixed(1) + "%";
  };

  // --- COMPREHENSIVE MASTER TRANSACTIONS FEED ENGINE ---
  const allMasterTransactions: MasterTransaction[] = [
    // 1. Revenues
    ...revenuesList.map((r) => ({
      id: `rev-${r.id}`,
      date: r.date || r.createdAt,
      type: "إيرادات وتحصيلات",
      categoryBadge: "💰 إيراد / تحصيل",
      isIncome: true,
      amount: r.amount || 0,
      description: r.description || r.source || "دفعة / إيراد وارد",
      projectName: r.project?.name || "عام / غير محدد",
      projectId: r.projectId,
    })),

    // 2. Project Expenses
    ...projectExpensesList.map((pe) => ({
      id: `pe-${pe.id}`,
      date: pe.date || pe.createdAt,
      type: "مصروفات موقع وخامات",
      categoryBadge: "💸 مصروف موقع",
      isIncome: false,
      amount: pe.amount || 0,
      description: pe.description || pe.type || "مصروف موقع وتجهيزات",
      projectName: pe.project?.name || "عام / حر",
      projectId: pe.projectId,
    })),

    // 3. Worker Dailies
    ...workerDailiesList.map((wd) => ({
      id: `wd-${wd.id}`,
      date: wd.date || wd.createdAt,
      type: "يوميات عمالة",
      categoryBadge: "👷 يومية عامل",
      isIncome: false,
      amount: wd.amount || 0,
      description: `يومية حضور للعامل (${wd.worker?.name || "عامل"}) - حالة: ${wd.status || "يوم كامل"}`,
      projectName: wd.project?.name || "عام / موقع حر",
      projectId: wd.projectId,
    })),

    // 4. Worker Advances & Deductions
    ...workerAdvancesList.map((wa) => ({
      id: `wa-${wa.id}`,
      date: wa.date || wa.createdAt,
      type: "سُلف وخصومات عمال",
      categoryBadge: wa.notes?.includes("خصم") ? "🛑 خصم مالي" : "💵 سلفة عامل",
      isIncome: false,
      amount: wa.amount || 0,
      description: `استقطاع/سلفة للعامل (${wa.worker?.name || "عامل"}): ${wa.notes || "سلفة نقدية"}`,
      projectName: wa.project?.name || "عام / شخصية",
      projectId: wa.projectId,
    })),

    // 5. Supervisor Salaries
    ...supervisorSalariesList.map((ss) => ({
      id: `ss-${ss.id}`,
      date: ss.date || ss.createdAt,
      type: "رواتب ومكافآت مشرفين",
      categoryBadge: "👔 راتب مشرف",
      isIncome: false,
      amount: ss.amount || 0,
      description: `صرف راتب/استحقاق المشرف (${ss.supervisor?.name || "مشرف"}) شهر ${ss.month || ""}`,
      projectName: ss.project?.name || "الإدارة العامة",
      projectId: ss.projectId,
    })),

    // 6. Supervisor Dailies
    ...supervisorDailiesList.map((sd) => ({
      id: `sd-${sd.id}`,
      date: sd.date || sd.createdAt,
      type: "يوميات مشرفين",
      categoryBadge: "👷 يومية مشرف",
      isIncome: false,
      amount: sd.amount || 0,
      description: `يومية حضور ميداني للمشرف (${sd.supervisor?.name || "مشرف"})`,
      projectName: sd.project?.name || "موقع عام",
      projectId: sd.projectId,
    })),

    // 7. Subcontractor Docs
    ...subcontractorDocsList.map((sd) => ({
      id: `sub-${sd.id}`,
      date: sd.date || sd.createdAt,
      type: "مستخلصات ودفعات مقاولين",
      categoryBadge: sd.type?.includes("خصم") ? "🛑 خصم مقاول" : "🤝 مستخلص مقاول",
      isIncome: false,
      amount: sd.amount || 0,
      description: `معاملة مقاول الباطن (${sd.subcontractor?.name || "مقاول"}): ${sd.description || "دفعة مستخلص"}`,
      projectName: sd.project?.name || "مشروع مقاولات",
      projectId: sd.projectId,
    })),

    // 8. Equipment Expenses
    ...equipmentExpensesList.map((ee) => {
      let projId = "";
      if (ee.notes && ee.notes.includes("projectId=")) {
        const pm = ee.notes.match(/projectId=([^\|\]]+)/);
        if (pm) projId = pm[1];
      }
      return {
        id: `eq-${ee.id}`,
        date: ee.date || ee.createdAt,
        type: "مصروفات وتغشيل معدات",
        categoryBadge: "⛽ تشغيل/وقود معدة",
        isIncome: false,
        amount: ee.amount || 0,
        description: `صيانة/وقود للمعدة (${ee.equipment?.name || "معدة"}): ${ee.description || ee.type || "مصروف تشغيل"}`,
        projectName: "معدات وتجهيزات",
        projectId: projId || null,
      };
    }),

    // 9. General Expenses
    ...generalExpensesList.map((ge) => {
      let projId = "";
      if (ge.notes && ge.notes.includes("targetId=")) {
        const tm = ge.notes.match(/targetId=([^\|\]]+)/);
        if (tm) projId = tm[1];
      }
      return {
        id: `ge-${ge.id}`,
        date: ge.date || ge.createdAt,
        type: "مصروفات عامة وإدارية",
        categoryBadge: "🧾 مصروف عام",
        isIncome: false,
        amount: ge.amount || 0,
        description: ge.description || ge.type || "مصروف عام للمقر الرئيسي",
        projectName: "المقر الرئيسي / عام",
        projectId: projId || null,
      };
    }),
  ];

  // Filter Master Transactions Feed
  const filteredMasterTransactions = allMasterTransactions.filter((tx) => {
    const matchProj = isProjectMatch(tx.projectId);
    const matchMonth = isMonthMatch(tx.date);
    const matchType = selectedTypeFilter === "all" || tx.type === selectedTypeFilter;

    const q = searchQuery.toLowerCase();
    const matchQuery =
      !q ||
      tx.description.toLowerCase().includes(q) ||
      tx.projectName.toLowerCase().includes(q) ||
      tx.categoryBadge.toLowerCase().includes(q);

    return matchProj && matchMonth && matchType && matchQuery;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const selectedProjObject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📑 الحسابات والمركز المالي وكشف الحركات الشامل</h1>
          <p className="page-subtitle">سجل موحد وشامل لكل حركة نقدية وإدارية بالنظام مع تقارير الطباعة المعتمدة</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            🖨️ طباعة التقرير والسجل المالي (A4)
          </button>
        </div>
      </div>

      {/* PRINT HEADERS FOR A4 PAPER */}
      <div className="hidden print:block" style={{ marginBottom: 20, textAlign: "center", borderBottom: "2px solid #000", paddingBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900 }}>شركة الجبل الذهبي للمقاولات والاستثمار العقاري</h2>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#333", marginTop: 4 }}>
          {activeTab === "statement" ? "📑 تقرير المركز المالي والحسابات المجمعة" : "📜 كشف سجل الحركات المالية والإدارية التفصيلي"}
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 10, color: "#555" }}>
          <span>المشروع: {selectedProjObject ? `${selectedProjObject.name} (${selectedProjObject.code})` : "جميع المشاريع والمركز العام"}</span>
          <span>فترة التقرير: {selectedMonth === "all" ? "كافة الشهور والتاريخ التراكمي" : selectedMonth}</span>
          <span>تاريخ الطباعة: {formatDateShort(new Date().toISOString())}</span>
        </div>
      </div>

      {/* NAVIGATION TABS SWITCHER */}
      <div className="print:hidden" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab("statement")}
          style={{
            padding: "9px 18px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 13,
            border: activeTab === "statement" ? "1px solid #3b82f6" : "1px solid transparent",
            background: activeTab === "statement" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "hsl(var(--bg-elevated))",
            color: activeTab === "statement" ? "#fff" : "hsl(var(--text-primary))",
          }}
        >
          📊 المركز المالي والميزانية العمومية
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          style={{
            padding: "9px 18px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 13,
            border: activeTab === "transactions" ? "1px solid #3b82f6" : "1px solid transparent",
            background: activeTab === "transactions" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "hsl(var(--bg-elevated))",
            color: activeTab === "transactions" ? "#fff" : "hsl(var(--text-primary))",
          }}
        >
          📜 كشف حركات السيستم الشامل ({filteredMasterTransactions.length} حركة)
        </button>
      </div>

      {/* FILTER CONTROLS: PROJECT & MONTH SELECTORS */}
      <div className="card print:hidden" style={{ padding: 16, marginBottom: 20 }}>
        <div className="grid-3" style={{ gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 800 }}>🏗️ التصفية حسب المشروع *</label>
            <select
              className="form-control"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="all">🏢 جميع المشاريع والمركز المالي العام</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 800 }}>📅 تحديد فترة التقرير الشهري *</label>
            <select
              className="form-control"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">التقرير المالي التراكمي (جميع الشهور)</option>
              <option value="2026-08">أغسطس 2026</option>
              <option value="2026-07">يوليو 2026</option>
              <option value="2026-06">يونيو 2026</option>
              <option value="2026-05">مايو 2026</option>
              <option value="2026-04">أبريل 2026</option>
            </select>
          </div>

          {activeTab === "transactions" && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 800 }}>🔍 تصفية حسب نوع المعاملة *</label>
              <select
                className="form-control"
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
              >
                <option value="all">جميع الحركات بالنظام</option>
                <option value="إيرادات وتحصيلات">💰 الإيرادات والتحصيلات فقط</option>
                <option value="مصروفات موقع وخامات">💸 مصروفات الموقع والتوريدات</option>
                <option value="يوميات عمالة">👷 يوميات العمال</option>
                <option value="سُلف وخصومات عمال">💵 سُلف وخصومات العمال</option>
                <option value="رواتب ومكافآت مشرفين">👔 رواتب ومكافآت المشرفين</option>
                <option value="مستخلصات ودفعات مقاولين">🤝 مستخلصات ودفعات المقاولين</option>
                <option value="مصروفات وتغشيل معدات">⛽ تشغيل ووقود المعدات</option>
                <option value="مصروفات عامة وإدارية">🧾 المصروفات العامة للمقر</option>
              </select>
            </div>
          )}
        </div>

        {activeTab === "transactions" && (
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              className="form-control"
              placeholder="🔍 بحث سريع في الحركات بالاسم، البيان، أو اسم المشروع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 4 COLOR-CODED METRIC CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        {/* CARD 1: REVENUES */}
        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)" }}>
          <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 700 }}>إجمالي الإيرادات المقبوضة</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{formatCurrency(totalRevenuesAmount)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع المقبوضات والدفعات الواردة بالنظام</div>
        </div>

        {/* CARD 2: TOTAL EXPENSES */}
        <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)" }}>
          <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 700 }}>إجمالي التكاليف والمصروفات</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{formatCurrency(totalOverallExpenses)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع المصروفات واليوميات والمستخلصات والمعدات</div>
        </div>

        {/* CARD 3: NET PROFIT / LOSS */}
        <div style={{ background: isLoss ? "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)" : "linear-gradient(135deg, #059669 0%, #064e3b 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
          <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 700 }}>{isLoss ? "صافي الخسارة (العجز المالي)" : "صافي الأرباح (الفائض المالي)"}</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{formatCurrency(Math.abs(netProfitOrLoss))}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{isLoss ? "العجز / صافي الخسارة المالية للفترة" : "الفائض / صافي أرباح التشغيل للفترة"}</div>
        </div>

        {/* CARD 4: CADRE & LABOR DAILIES */}
        <div style={{ background: "linear-gradient(135deg, #d97706 0%, #92400e 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 14px rgba(217, 119, 6, 0.25)" }}>
          <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 700 }}>يوميات ورواتب الكوادر</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>{formatCurrency(totalLaborCosts + totalSupervisorCosts)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>يوميات وسُلف العمال + رواتب المشرفين</div>
        </div>
      </div>

      {/* TAB 1: FINANCIAL STATEMENT */}
      {activeTab === "statement" && (
        <div className="card">
          <div className="card-header" style={{ padding: "16px 20px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 900 }}>📊 تفاصيل التكاليف والمصروفات بالكامل</h3>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="empty-state">
                <span className="spinner" style={{ width: 30, height: 30 }} />
                <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل البيانات المالية...</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 45, textAlign: "center" }}>#</th>
                    <th>بند التكلفة والمصروف</th>
                    <th>المبلغ المستقطع (EGP)</th>
                    <th style={{ textAlign: "center" }}>النسبة من إجمالي التكاليف</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>1</td>
                    <td style={{ fontWeight: 800 }}>مصروفات المشاريع (مواد، خامات، معدات بالموقع، رواتب مخصصة)</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(totalProjectExpensesAmount)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-info">{calcPercent(totalProjectExpensesAmount)}</span>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>2</td>
                    <td style={{ fontWeight: 800 }}>يوميات وسلف عمالة الموقع</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(totalLaborCosts)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-info">{calcPercent(totalLaborCosts)}</span>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>3</td>
                    <td style={{ fontWeight: 800 }}>رواتب ومكافآت ويوميات المشرفين</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(totalSupervisorCosts)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-info">{calcPercent(totalSupervisorCosts)}</span>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>4</td>
                    <td style={{ fontWeight: 800 }}>مستخلصات ودفعات مقاولي الباطن</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(totalSubcontractorCosts)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-info">{calcPercent(totalSubcontractorCosts)}</span>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>5</td>
                    <td style={{ fontWeight: 800 }}>وقود ومصروفات تشغيل وصيانة المعدات والآلات</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(totalEquipmentCosts)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-info">{calcPercent(totalEquipmentCosts)}</span>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>6</td>
                    <td style={{ fontWeight: 800 }}>المصروفات الإدارية العامة والتشغيلية للمقر الرئيسي</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(totalGeneralExpensesAmount)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-info">{calcPercent(totalGeneralExpensesAmount)}</span>
                    </td>
                  </tr>

                  <tr style={{ background: "hsl(var(--bg-elevated))", fontWeight: 900 }}>
                    <td colSpan={2} style={{ textAlign: "right", paddingRight: 20, fontSize: 14 }}>
                      إجمالي التكاليف والمصروفات بالكامل:
                    </td>
                    <td style={{ fontSize: 16, color: "#dc2626", fontWeight: 900 }}>
                      {formatCurrency(totalOverallExpenses)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge badge-success">100%</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FULL SYSTEM TRANSACTIONS AUDIT FEED */}
      {activeTab === "transactions" && (
        <div className="card">
          <div className="card-header" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 16, fontWeight: 900 }}>📜 كشف سجل الحركات التفصيلي للنظام بالكامل</h3>
            <span style={{ fontSize: 12, opacity: 0.8 }}>إجمالي الحركات المعروضة: ({filteredMasterTransactions.length} حركة)</span>
          </div>

          <div className="table-container">
            {loading ? (
              <div className="empty-state">
                <span className="spinner" style={{ width: 30, height: 30 }} />
                <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل كشف الحركات الشامل...</div>
              </div>
            ) : filteredMasterTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-text">لا توجد حركات تطابق الفلاتر المحددة</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 45, textAlign: "center" }}>#</th>
                    <th>تاريخ الحركة</th>
                    <th>نوع المعاملة</th>
                    <th>المشروع / الموقع</th>
                    <th>البيان والتفاصيل</th>
                    <th>قيمة المعاملة (EGP)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMasterTransactions.map((tx, idx) => (
                    <tr key={tx.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ fontSize: 12 }}>{formatDateShort(tx.date)}</td>
                      <td>
                        <span className={`badge ${tx.isIncome ? "badge-success" : tx.categoryBadge.includes("خصم") ? "badge-danger" : "badge-info"}`}>
                          {tx.categoryBadge}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: "hsl(var(--gold))" }}>{tx.projectName}</td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{tx.description}</td>
                      <td style={{ fontWeight: 900, color: tx.isIncome ? "#10b981" : "#ef4444", fontSize: 14 }}>
                        {tx.isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* PRINT SIGNATURE BLOCK FOR OFFICIAL A4 REPORT */}
      <div className="hidden print:block" style={{ marginTop: 40, paddingTop: 20, borderTop: "1px dashed #ccc" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", fontSize: 12, fontWeight: 800 }}>
          <div>
            <div>توقيع وتختيم الحسابات</div>
            <div style={{ marginTop: 35 }}>...................................</div>
          </div>

          <div>
            <div>توقيع المدير المالي</div>
            <div style={{ marginTop: 35 }}>...................................</div>
          </div>

          <div>
            <div>يعتمد / رئيس مجلس الإدارة</div>
            <div style={{ marginTop: 35 }}>...................................</div>
          </div>
        </div>
      </div>
    </div>
  );
}
