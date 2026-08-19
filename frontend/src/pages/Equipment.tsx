import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface EquipmentExpenseItem {
  id: string;
  equipmentId: string;
  projectId?: string;
  project?: { id: string; name: string; code?: string };
  type: string; // "إيجار ويومية تشغيل", "سولار وجاز وبنزين", "صيانة وإصلاحات", "زيوت وتشحيم", "قطع غيار ونثريات", "نقل ومشال"
  description: string;
  amount: number;
  driverName?: string;
  liters?: number;
  hours?: number;
  date: string;
  notes?: string;
}

interface Equipment {
  id: string;
  name: string;
  type?: string;
  plateNumber?: string;
  ownership?: string; // "مملوكة للشركة" | "مستأجرة من مقاول/مورد"
  vendorName?: string;
  vendorPhone?: string;
  dailyRate?: number;
  assignedDriver?: string;
  assignedProjectId?: string;
  status: string; // "يعمل" | "صيانة" | "متوقف"
  notes?: string;
  expenses?: EquipmentExpenseItem[];
}

interface Project {
  id: string;
  code: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  jobRole: string;
}

export default function EquipmentPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [allExpensesList, setAllExpensesList] = useState<EquipmentExpenseItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [driversList, setDriversList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterOwnership, setFilterOwnership] = useState("all");

  // Add / Edit Equipment Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("حفارة");
  const [plateNumber, setPlateNumber] = useState("");
  const [ownership, setOwnership] = useState("مملوكة للشركة");
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [assignedDriver, setAssignedDriver] = useState("");
  const [assignedProjectId, setAssignedProjectId] = useState("");
  const [status, setStatus] = useState("يعمل");
  const [notes, setNotes] = useState("");

  // Operating Expense Log Modal (تسجيل وقود/يوميات/صيانة وتصفية مشروع)
  const [showExpModal, setShowExpModal] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState("");
  const [expProjectId, setExpProjectId] = useState("");
  const [expType, setExpType] = useState("سولار وجاز وبنزين");
  const [expAmount, setExpAmount] = useState("");
  const [expDriverName, setExpDriverName] = useState("");
  const [expLiters, setExpLiters] = useState("");
  const [expHours, setExpHours] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expNotes, setExpNotes] = useState("");
  const [submittingExp, setSubmittingExp] = useState(false);

  // Statement / Log Modal (كشف حساب وسجل تشغيل المعدة)
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [activeEquipmentForStatement, setActiveEquipmentForStatement] = useState<Equipment | null>(null);
  const [statementExpenses, setStatementExpenses] = useState<EquipmentExpenseItem[]>([]);

  // Company info for print
  const [companyName, setCompanyName] = useState("الجبل الذهبي للمقاولات والاستثمار العقاري");
  const [companyPhone, setCompanyPhone] = useState("01120715027");
  const [companyLogo, setCompanyLogo] = useState("/logo.jpeg");

  const printStatementRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eqRes, projRes, empRes, expRes, settingsRes] = await Promise.all([
        supabase.from("Equipment").select("*, expenses:EquipmentExpense(*)").order("name", { ascending: true }),
        supabase.from("Project").select("id, code, name").order("name", { ascending: true }),
        supabase.from("Employee").select("id, name, jobRole").order("name", { ascending: true }),
        supabase.from("EquipmentExpense").select("*, equipment:Equipment(name)").order("date", { ascending: false }),
        supabase.from("Setting").select("*"),
      ]);

      if (settingsRes.data) {
        const nameS = settingsRes.data.find((s: any) => s.key === "companyName");
        const phoneS = settingsRes.data.find((s: any) => s.key === "phone");
        const logoS = settingsRes.data.find((s: any) => s.key === "companyLogo");
        if (nameS?.value) setCompanyName(nameS.value);
        if (phoneS?.value) setCompanyPhone(phoneS.value);
        if (logoS?.value) setCompanyLogo(logoS.value);
      }

      if (projRes.data) setProjects(projRes.data);
      if (expRes.data) setAllExpensesList(expRes.data);

      if (empRes.data) {
        setDriversList(
          empRes.data.filter((e) =>
            (e.jobRole || "").includes("سائق") || (e.jobRole || "").includes("مشرف") || (e.jobRole || "").includes("فني")
          )
        );
      }

      if (eqRes.data) {
        // Parse metadata if stored in notes
        const parsedList: Equipment[] = eqRes.data.map((eq: any) => {
          let parsedMeta: any = null;
          if (eq.notes && eq.notes.startsWith("{")) {
            try {
              parsedMeta = JSON.parse(eq.notes);
            } catch (e) {}
          }
          return {
            ...eq,
            ownership: parsedMeta?.ownership || "مملوكة للشركة",
            vendorName: parsedMeta?.vendorName || "",
            vendorPhone: parsedMeta?.vendorPhone || "",
            dailyRate: parsedMeta?.dailyRate || 0,
            assignedDriver: parsedMeta?.assignedDriver || "",
            assignedProjectId: parsedMeta?.assignedProjectId || "",
            notes: parsedMeta?.customNotes || (eq.notes?.startsWith("{") ? "" : eq.notes || ""),
          };
        });
        setEquipmentList(parsedList);
      }
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل بيانات المعدات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName("");
    setType("حفارة");
    setPlateNumber("");
    setOwnership("مملوكة للشركة");
    setVendorName("");
    setVendorPhone("");
    setDailyRate("");
    setAssignedDriver("");
    setAssignedProjectId("");
    setStatus("يعمل");
    setNotes("");
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (eq: Equipment) => {
    setEditingItem(eq);
    setName(eq.name || "");
    setType(eq.type || "حفارة");
    setPlateNumber(eq.plateNumber || "");
    setOwnership(eq.ownership || "مملوكة للشركة");
    setVendorName(eq.vendorName || "");
    setVendorPhone(eq.vendorPhone || "");
    setDailyRate(eq.dailyRate ? eq.dailyRate.toString() : "");
    setAssignedDriver(eq.assignedDriver || "");
    setAssignedProjectId(eq.assignedProjectId || "");
    setStatus(eq.status || "يعمل");
    setNotes(eq.notes || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      const metaPayload = {
        ownership,
        vendorName,
        vendorPhone,
        dailyRate: parseFloat(dailyRate) || 0,
        assignedDriver,
        assignedProjectId,
        customNotes: notes,
      };

      const payload = {
        name: name.trim(),
        type,
        plateNumber: plateNumber.trim(),
        status,
        notes: JSON.stringify(metaPayload),
      };

      if (editingItem) {
        const { error } = await supabase.from("Equipment").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        showToast("تم تحديث بيانات المعدة بنجاح 🚛✅", "success");
      } else {
        const { error } = await supabase.from("Equipment").insert([payload]);
        if (error) throw error;
        showToast("تم تسجيل المعدة الجديدة وربطها بالنظام بنجاح 🚛🎉", "success");
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Save Operating Expense & Auto-Post to Project Expense
  const handleSaveOperatingExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId || !expAmount) {
      showToast("برجاء اختيار المعدة وإدخال قيمة المصروف", "warning");
      return;
    }

    setSubmittingExp(true);
    try {
      const amt = parseFloat(expAmount) || 0;
      const selectedEq = equipmentList.find((eq) => eq.id === selectedEqId);
      const eqNameStr = selectedEq ? selectedEq.name : "معدة";
      const targetProj = projects.find((p) => p.id === expProjectId);
      const projNameStr = targetProj ? targetProj.name : "مشروع عام";

      const detailsList = [];
      if (expLiters) detailsList.push(expLiters + " لتر");
      if (expHours) detailsList.push(expHours + " ساعة/يوم تشغيل");
      if (expDriverName) detailsList.push("السائق: " + expDriverName);
      const detailsSuffix = detailsList.length > 0 ? " (" + detailsList.join(" - ") + ")" : "";

      const descStr = expType + " للمعدة (" + eqNameStr + ") - بمشروع " + projNameStr + detailsSuffix;

      // 1. Insert into EquipmentExpense
      const { error: eqErr } = await supabase.from("EquipmentExpense").insert([
        {
          equipmentId: selectedEqId,
          type: expType,
          amount: amt,
          description: descStr,
          date: new Date(expDate).toISOString(),
        },
      ]);
      if (eqErr) throw eqErr;

      // 2. If Project Selected, Post Directly to ProjectExpense as well!
      if (expProjectId) {
        await supabase.from("ProjectExpense").insert([
          {
            projectId: expProjectId,
            type: expType.includes("إيجار") ? "إيجار معدات" : "خامات ومصروف موقع",
            amount: amt,
            description: "تشغيل معدات وآليات: " + descStr,
            notes:
              "[meta:supervisor=" +
              (expDriverName || "مسؤول الحركة") +
              "|targetCategory=معدات وآليات|status=✅ معتمد ومرحل] " +
              (expNotes || descStr),
            date: new Date(expDate).toISOString(),
          },
        ]);
      }

      showToast("تم تسجيل مصروف تشغيل المعدة وترحيله لحساب المشروع بنجاح ⛽✅", "success");
      setShowExpModal(false);
      setExpAmount("");
      setExpLiters("");
      setExpHours("");
      setExpNotes("");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "فشل في تسجيل مصروف المعدة", "error");
    } finally {
      setSubmittingExp(false);
    }
  };

  // Open Statement / History for single equipment
  const handleOpenStatement = (eq: Equipment) => {
    setActiveEquipmentForStatement(eq);
    const related = allExpensesList.filter((e) => e.equipmentId === eq.id);
    setStatementExpenses(related);
    setShowStatementModal(true);
  };

  const handleDeleteExpenseItem = async (expId: string, amt: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا القيد بقيمة (" + formatCurrency(amt) + ")؟")) return;
    try {
      await supabase.from("EquipmentExpense").delete().eq("id", expId);
      showToast("تم حذف قيد المصروف بنجاح 🗑️", "success");
      setStatementExpenses((prev) => prev.filter((x) => x.id !== expId));
      fetchData();
    } catch (e: any) {
      showToast("فشل في حذف المصروف", "error");
    }
  };

  const handleDelete = async (id: string, eqName: string) => {
    if (!confirm("هل أنت متأكد من حذف المعدة (" + eqName + ") وجميع سجلات مصروفاتها؟")) return;
    try {
      await supabase.from("EquipmentExpense").delete().eq("equipmentId", id);
      const { error } = await supabase.from("Equipment").delete().eq("id", id);
      if (error) throw error;
      showToast("تم حذف المعدة وسجلاتها بنجاح 🗑️", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Filtered List
  const filtered = equipmentList.filter((eq) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      !s ||
      eq.name.toLowerCase().includes(s) ||
      (eq.plateNumber && eq.plateNumber.includes(s)) ||
      (eq.type && eq.type.toLowerCase().includes(s)) ||
      (eq.assignedDriver && eq.assignedDriver.toLowerCase().includes(s)) ||
      (eq.vendorName && eq.vendorName.toLowerCase().includes(s));

    const matchStatus = filterStatus === "all" || eq.status === filterStatus;
    const matchProj = filterProject === "all" || eq.assignedProjectId === filterProject;
    const matchOwnership = filterOwnership === "all" || eq.ownership === filterOwnership;

    return matchSearch && matchStatus && matchProj && matchOwnership;
  });

  // Calculate Aggregates
  const totalEquipmentCount = equipmentList.length;
  const activeCount = equipmentList.filter((e) => e.status === "يعمل").length;
  const maintenanceCount = equipmentList.filter((e) => e.status === "صيانة").length;
  const totalOperatingExpenses = allExpensesList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const rentedCount = equipmentList.filter((e) => e.ownership?.includes("مستأجرة")).length;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 60 }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header print:hidden" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>🚛</span>
            <span>إدارة المعدات والسيارات ومصروفات التشغيل المربوطة بالمشاريع</span>
          </h1>
          <p className="page-subtitle">
            سجل موحد لحصر المعدات والآليات، يوميات الوقود والجاز، السائقين، وتصفية التكاليف المالية على حسابات المشاريع
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-gold"
            onClick={() => {
              setSelectedEqId(equipmentList[0]?.id || "");
              setExpProjectId(projects[0]?.id || "");
              setShowExpModal(true);
            }}
            style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>⛽</span>
            <span>+ تسجيل تشغيل ومصروف معدة (وقود/يومية/صيانة)</span>
          </button>

          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
            <span>➕</span>
            <span>إضافة معدة جديدة</span>
          </button>

          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة الكشف
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS (SIDE BY SIDE & VIBRANTLY COLORED) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* CARD 1: BLUE (TOTAL ASSETS) */}
        <div
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            border: "1.5px solid #93c5fd",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1e40af", background: "#bfdbfe", padding: "2px 8px", borderRadius: 20 }}>
                🚛 أسطول المعدات والسيارات
              </span>
              <div style={{ fontSize: 13, color: "#1e3a8a", fontWeight: 800, marginTop: 8 }}>
                إجمالي الآليات المسجلة
              </div>
            </div>
            <span style={{ fontSize: 26 }}>🚜</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#1d4ed8", marginTop: 10 }}>
            {totalEquipmentCount} معدة / سيارة
          </div>
          <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, marginTop: 4 }}>
            منها {activeCount} تعمل بالمواقع حالياً
          </div>
        </div>

        {/* CARD 2: GREEN (OPERATING & FUEL EXPENSES) */}
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1.5px solid #86efac",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#166534", background: "#bbf7d0", padding: "2px 8px", borderRadius: 20 }}>
                ⛽ تكاليف التشغيل والوقود
              </span>
              <div style={{ fontSize: 13, color: "#14532d", fontWeight: 800, marginTop: 8 }}>
                مصروفات المعدات المسجلة
              </div>
            </div>
            <span style={{ fontSize: 26 }}>💰</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#15803d", marginTop: 10 }}>
            {formatCurrency(totalOperatingExpenses)}
          </div>
          <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 800, marginTop: 4 }}>
            مرحلة لحسابات ومصروفات المشاريع
          </div>
        </div>

        {/* CARD 3: AMBER (MAINTENANCE & WORKSHOP) */}
        <div
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: "1.5px solid #fde68a",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#92400e", background: "#fde68a", padding: "2px 8px", borderRadius: 20 }}>
                🔧 الصيانة والجاهزية
              </span>
              <div style={{ fontSize: 13, color: "#78350f", fontWeight: 800, marginTop: 8 }}>
                المعدات تحت الصيانة
              </div>
            </div>
            <span style={{ fontSize: 26 }}>🛠️</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#b45309", marginTop: 10 }}>
            {maintenanceCount} في الصيانة
          </div>
          <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700, marginTop: 4 }}>
            نسبة الجاهزية: {totalEquipmentCount > 0 ? Math.round((activeCount / totalEquipmentCount) * 100) : 0}%
          </div>
        </div>

        {/* CARD 4: PURPLE / INDIGO (OWNERSHIP BREAKDOWN) */}
        <div
          style={{
            background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
            border: "1.5px solid #c4b5fd",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#5b21b6", background: "#ddd6fe", padding: "2px 8px", borderRadius: 20 }}>
                🏢 الملكية والتأجير
              </span>
              <div style={{ fontSize: 13, color: "#4c1d95", fontWeight: 800, marginTop: 8 }}>
                معدات ملك vs مستأجرة
              </div>
            </div>
            <span style={{ fontSize: 26 }}>🤝</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#6d28d9", marginTop: 10 }}>
            {totalEquipmentCount - rentedCount} ملك / {rentedCount} إيجار
          </div>
          <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, marginTop: 4 }}>
            عبر {projects.length} مشروع بالمواقع
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>🔍 البحث السريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث باسم المعدة، اللوحة، السائق، المورد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>🏗️ المشروع المرتبط</label>
            <select className="form-control" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="all">-- كل المشاريع --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>🏢 نوع التبعية / الملكية</label>
            <select className="form-control" value={filterOwnership} onChange={(e) => setFilterOwnership(e.target.value)}>
              <option value="all">-- كل الأنواع --</option>
              <option value="مملوكة للشركة">مملوكة للشركة 🏢</option>
              <option value="مستأجرة من مقاول/مورد">مستأجرة من مورد خارجي 🤝</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>⚙️ حالة التشغيل</label>
            <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">-- كل الحالات --</option>
              <option value="يعمل">يعمل بالموقع ✅</option>
              <option value="صيانة">تحت الصيانة 🔧</option>
              <option value="متوقف">متوقف / عاطل ❌</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل سجل المعدات والآليات...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <span style={{ fontSize: 40 }}>🚛</span>
              <div className="empty-state-text" style={{ marginTop: 12, fontWeight: 800 }}>
                {searchTerm ? "لا توجد نتائج تطابق البحث" : "لم يتم تسجيل أي معدات بالشركة بعد"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={handleOpenAdd}>
                + إضافة أول معدة الآن
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>اسم المعدة / الآلية</th>
                  <th>النوع</th>
                  <th>التبعية والملكية</th>
                  <th>رقم اللوحة / الشاسي</th>
                  <th>السائق / المشغل المسؤول</th>
                  <th>المشروع الحالي</th>
                  <th>إجمالي تكاليف التشغيل والوقود</th>
                  <th style={{ textAlign: "center" }}>حالة التشغيل</th>
                  <th className="print:hidden" style={{ textAlign: "center", minWidth: 220 }}>الإجراءات وكشف الحساب</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((eq, idx) => {
                  const totalExp = allExpensesList
                    .filter((e) => e.equipmentId === eq.id)
                    .reduce((sum, e) => sum + (e.amount || 0), 0);

                  const assignedProjObj = projects.find((p) => p.id === eq.assignedProjectId);

                  return (
                    <tr key={eq.id}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 900, color: "#1e3a8a", fontSize: 14 }}>{eq.name}</div>
                        {eq.notes && <div style={{ fontSize: 11, color: "hsl(var(--text-muted))" }}>{eq.notes}</div>}
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontWeight: 700 }}>{eq.type || "معدة"}</span>
                      </td>
                      <td>
                        <span
                          className={"badge " + (eq.ownership?.includes("مستأجرة") ? "badge-warning" : "badge-success")}
                          style={{ fontWeight: 800, fontSize: 11 }}
                        >
                          {eq.ownership?.includes("مستأجرة") ? "🤝 إيجار خارجي" : "🏢 ملك الشركة"}
                        </span>
                        {eq.vendorName && (
                          <div style={{ fontSize: 11, color: "#92400e", marginTop: 2 }}>المورد: {eq.vendorName}</div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>{eq.plateNumber || "-"}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>
                          {eq.assignedDriver || "غير مخصص"}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontWeight: 700 }}>
                          {assignedProjObj ? assignedProjObj.name : "عام / ورشة الشركة"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 900, color: "#b91c1c", fontSize: 14 }}>
                        {formatCurrency(totalExp)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={"badge " + (
                            eq.status === "يعمل" ? "badge-success" : eq.status === "صيانة" ? "badge-warning" : "badge-danger"
                          )}
                          style={{ fontWeight: 800 }}
                        >
                          {eq.status === "يعمل" ? "✅ يعمل بالموقع" : eq.status === "صيانة" ? "🔧 تحت الصيانة" : "❌ متوقف"}
                        </span>
                      </td>
                      <td className="print:hidden" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                          {/* 1. + مصروف تشغيل */}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#166534", background: "#dcfce7", border: "1px solid #86efac", padding: "4px 8px", fontSize: 11, fontWeight: 800 }}
                            onClick={() => {
                              setSelectedEqId(eq.id);
                              setExpProjectId(eq.assignedProjectId || projects[0]?.id || "");
                              setExpDriverName(eq.assignedDriver || "");
                              setShowExpModal(true);
                            }}
                            title="تسجيل مصروف تشغيل، سولار، أو صيانة"
                          >
                            ⛽ + مصروف
                          </button>

                          {/* 2. كشف حساب وسجل التشغيل */}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "4px 8px", fontSize: 11, fontWeight: 800 }}
                            onClick={() => handleOpenStatement(eq)}
                            title="كشف حساب وسجل تشغيل المعدة الشامل"
                          >
                            📑 كشف حساب
                          </button>

                          {/* 3. تعديل */}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#475569", background: "#f1f5f9", padding: "4px 6px", fontSize: 12 }}
                            onClick={() => handleOpenEdit(eq)}
                            title="تعديل بيانات المعدة"
                          >
                            ✏️
                          </button>

                          {/* 4. حذف */}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#ef4444", background: "#fee2e2", padding: "4px 6px", fontSize: 12 }}
                            onClick={() => handleDelete(eq.id, eq.name)}
                            title="حذف المعدة"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ADD / EDIT EQUIPMENT MODAL */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItem ? "✏️ تعديل بيانات المعدة / الآلية" : "🚛 إضافة معدة / سيارة جديدة للنظام"}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">اسم المعدة / الآلية *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: حفارة كوماتسو 200 / لودر كاتربيلر..."
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع المعدة / التصنيف *</label>
                    <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="حفارة">حفارة (Excavator)</option>
                      <option value="لودر">لودر (Loader)</option>
                      <option value="سيارة نقل / شاحنة قلاب">سيارة نقل / شاحنة قلاب</option>
                      <option value="خلاطة خرسانة / بوم">خلاطة خرسانة / بوم</option>
                      <option value="مولد كهربائي">مولد كهربائي ديزل</option>
                      <option value="رافعات / أوناش">رافعات / أوناش (Crane)</option>
                      <option value="سيارة إشراف ومهندسين">سيارة إشراف ومهندسين</option>
                      <option value="معدات دك ورص">معدات دك ورص (هراس)</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                <div className="grid-3" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">رقم اللوحة / الشاسي</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: أ ب ج 1234"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع التبعية والملكية *</label>
                    <select className="form-control" value={ownership} onChange={(e) => setOwnership(e.target.value)}>
                      <option value="مملوكة للشركة">مملوكة للشركة 🏢</option>
                      <option value="مستأجرة من مقاول/مورد">مستأجرة من مورد خارجي 🤝</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">حالة التشغيل *</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="يعمل">يعمل بالموقع ✅</option>
                      <option value="صيانة">تحت الصيانة والإصلاح 🔧</option>
                      <option value="متوقف">متوقف / عاطل ❌</option>
                    </select>
                  </div>
                </div>

                {/* IF RENTED EQUIPMENT: VENDOR DETAILS */}
                {ownership === "مستأجرة من مقاول/مورد" && (
                  <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, color: "#92400e", fontSize: 12, marginBottom: 8 }}>
                      🤝 بيانات مورد / مقاول تأجير المعدة الخارجي:
                    </div>
                    <div className="grid-3" style={{ gap: 10 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>اسم المورد / الشركة</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="اسم المورد..."
                          value={vendorName}
                          onChange={(e) => setVendorName(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>هاتف المورد</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="01xxxxxxxxx"
                          value={vendorPhone}
                          onChange={(e) => setVendorPhone(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>سعر اليومية المتفق عليه (جنيه)</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0.00"
                          value={dailyRate}
                          onChange={(e) => setDailyRate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">السائق / المشغل المسؤول</label>
                    <select
                      className="form-control"
                      value={assignedDriver}
                      onChange={(e) => setAssignedDriver(e.target.value)}
                    >
                      <option value="">-- اختر من قائمة السائقين والمشرفين --</option>
                      {driversList.map((d) => (
                        <option key={d.id} value={d.name}>{d.name} ({d.jobRole})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">المشروع الحالي المسندة إليه</label>
                    <select
                      className="form-control"
                      value={assignedProjectId}
                      onChange={(e) => setAssignedProjectId(e.target.value)}
                    >
                      <option value="">-- عام / غير مخصصة لمشروع --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات ومواصفات إضافية</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="أدخل أي مواصفات أو ملاحظات عن حالة المعدة..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : editingItem ? "حفظ التعديلات" : "حفظ وتسجيل المعدة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. OPERATING EXPENSE & FUEL LOG MODAL (تسميع في المصروفات والمشاريع) */}
      {/* ========================================================================= */}
      {showExpModal && (
        <div className="modal-overlay" onClick={() => setShowExpModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">⛽ تسجيل مصروف وتشغيل معدة وربطه بحساب المشروع</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowExpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveOperatingExpense}>
              <div className="modal-body">
                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">اختر المعدة / الآلية *</label>
                    <select
                      className="form-control"
                      required
                      value={selectedEqId}
                      onChange={(e) => {
                        setSelectedEqId(e.target.value);
                        const matched = equipmentList.find((eq) => eq.id === e.target.value);
                        if (matched?.assignedProjectId) setExpProjectId(matched.assignedProjectId);
                        if (matched?.assignedDriver) setExpDriverName(matched.assignedDriver);
                      }}
                    >
                      <option value="" disabled>-- اختر المعدة --</option>
                      {equipmentList.map((eq) => (
                        <option key={eq.id} value={eq.id}>{eq.name} ({eq.type})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">نوع حركة التشغيل والمصروف *</label>
                    <select className="form-control" value={expType} onChange={(e) => setExpType(e.target.value)}>
                      <option value="سولار وجاز وبنزين">سولار ومحروقات وجاز ⛽</option>
                      <option value="إيجار ويومية تشغيل">إيجار ويومية تشغيل ⏱️</option>
                      <option value="صيانة وإصلاحات">صيانة وإصلاحات وورشة 🔧</option>
                      <option value="زيوت وتشحيم">زيوت وفلاتر وتشحيم 🛢️</option>
                      <option value="قطع غيار ونثريات">قطع غيار ونثريات ⚙️</option>
                      <option value="نقل ومشال كساحة">نقل ومشال كساحة 🚛</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">المشروع المستفيد (تصفية التكلفة) *</label>
                    <select
                      className="form-control"
                      required
                      value={expProjectId}
                      onChange={(e) => setExpProjectId(e.target.value)}
                    >
                      <option value="" disabled>-- اختر المشروع المستفيد --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">إجمالي المبلغ المنصرف (جنيه) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      required
                      placeholder="0.00"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-3" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">كمية الوقود باللتر (اختياري)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      placeholder="مثال: 50 لتر"
                      value={expLiters}
                      onChange={(e) => setExpLiters(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ساعات/أيام التشغيل</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      placeholder="مثال: 8 ساعات / 1 يوم"
                      value={expHours}
                      onChange={(e) => setExpHours(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ الصرف والتشغيل *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">السائق / المشرف القائم بالتشغيل</label>
                  <select
                    className="form-control"
                    value={expDriverName}
                    onChange={(e) => setExpDriverName(e.target.value)}
                  >
                    <option value="">-- اختر السائق أو المشرف المسؤول --</option>
                    {driversList.map((d) => (
                      <option key={d.id} value={d.name}>{d.name} ({d.jobRole})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">بيان وملاحظات الصرف والتوريد</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: تزويد جاز بمحطة الموقع للبدء في أعمال الحفر..."
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                  />
                </div>

                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 10, fontSize: 12, color: "#166534" }}>
                  💡 <strong>ملاحظة الترحيل التلقائي:</strong> سيتم تسجيل هذا المصروف فوراً في كشف حساب المعدة وترحيله تلقائياً إلى <strong>مصروفات المشروع المحدد</strong> ليظهر في المركز المالي والتكلفة التشغيلية.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowExpModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submittingExp}>
                  {submittingExp ? <span className="spinner" /> : "💾 حفظ وترحيل المصروف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STATEMENT & EQUIPMENT LOG MODAL (كشف حساب وتشغيل المعدة) */}
      {/* ========================================================================= */}
      {showStatementModal && activeEquipmentForStatement && (
        <div className="modal-overlay" onClick={() => setShowStatementModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 880, background: "#ffffff" }}>
            <div className="modal-header no-print" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <h2 className="modal-title" style={{ color: "#0f172a" }}>
                📑 كشف حساب وسجل تشغيل المعدة ({activeEquipmentForStatement.name})
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()} style={{ fontWeight: 800 }}>
                  🖨️ طباعة كشف الحساب
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowStatementModal(false)}>✕</button>
              </div>
            </div>

            <div className="modal-body print-area" ref={printStatementRef} style={{ color: "#000", background: "#ffffff", padding: "24px 28px" }}>
              {/* PRINT HEADER */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px double #000", paddingBottom: 14, marginBottom: 18 }}>
                <div style={{ textAlign: "right" }}>
                  <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: "#000" }}>{companyName}</h1>
                  <div style={{ fontSize: 12, marginTop: 4, color: "#333" }}>إدارة الآليات وحركة المعدات والمشاريع</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: "#555" }}>هاتف: {companyPhone}</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <img
                    src={companyLogo}
                    alt="Logo"
                    style={{ height: 55, width: 55, objectFit: "contain", borderRadius: 8 }}
                    onError={(e) => { e.currentTarget.src = "/logo.jpeg"; }}
                  />
                  <div style={{ fontSize: 14, fontWeight: 900, marginTop: 4 }}>كشف حساب ومصروفات تشغيل معدة</div>
                </div>

                <div style={{ textAlign: "left", fontSize: 11, color: "#333" }}>
                  <div><strong>تاريخ التقرير:</strong> {formatDateShort(new Date().toISOString())}</div>
                  <div><strong>المعدة:</strong> {activeEquipmentForStatement.name}</div>
                  <div><strong>اللوحة:</strong> {activeEquipmentForStatement.plateNumber || "-"}</div>
                </div>
              </div>

              {/* EQUIPMENT INFO CARD */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, padding: 12, marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>المعدة / الآلية:</div>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>{activeEquipmentForStatement.name}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>النوع: {activeEquipmentForStatement.type}</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>التبعية والملكية:</div>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>{activeEquipmentForStatement.ownership}</div>
                  {activeEquipmentForStatement.vendorName && (
                    <div style={{ fontSize: 11, color: "#92400e" }}>المورد: {activeEquipmentForStatement.vendorName}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>إجمالي تكاليف التشغيل:</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#b91c1c" }}>
                    {formatCurrency(statementExpenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
                  </div>
                  <div style={{ fontSize: 11, color: "#166534" }}>عدد الحركات: {statementExpenses.length} حركة</div>
                </div>
              </div>

              {/* TRANSACTIONS TABLE */}
              <div className="table-container" style={{ border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
                {statementExpenses.length === 0 ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <div className="empty-state-text">لا توجد حركات أو مصروفات مسجلة لهذه المعدة حتى الآن</div>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #000" }}>
                        <th style={{ padding: "8px 6px", width: 35, textAlign: "center", border: "1px solid #cbd5e1" }}>#</th>
                        <th style={{ padding: "8px 6px", width: 90, textAlign: "center", border: "1px solid #cbd5e1" }}>التاريخ</th>
                        <th style={{ padding: "8px 6px", width: 130, border: "1px solid #cbd5e1" }}>نوع المصروف / الحركة</th>
                        <th style={{ padding: "8px 8px", border: "1px solid #cbd5e1" }}>البيان والتفاصيل</th>
                        <th style={{ padding: "8px 6px", width: 110, textAlign: "center", border: "1px solid #cbd5e1" }}>المبلغ (جنيه)</th>
                        <th className="no-print" style={{ padding: "8px 6px", width: 50, textAlign: "center", border: "1px solid #cbd5e1" }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementExpenses.map((x, idx) => (
                        <tr key={x.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ textAlign: "center", fontWeight: 700, border: "1px solid #cbd5e1" }}>{idx + 1}</td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", border: "1px solid #cbd5e1" }}>{formatDateShort(x.date)}</td>
                          <td style={{ border: "1px solid #cbd5e1" }}>
                            <span className="badge badge-info">{x.type}</span>
                          </td>
                          <td style={{ fontSize: 12, border: "1px solid #cbd5e1" }}>{x.description}</td>
                          <td style={{ fontWeight: 900, color: "#b91c1c", textAlign: "center", fontSize: 13, border: "1px solid #cbd5e1" }}>
                            {formatCurrency(x.amount)}
                          </td>
                          <td className="no-print" style={{ textAlign: "center", border: "1px solid #cbd5e1" }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: "#ef4444", padding: "2px 6px" }}
                              onClick={() => handleDeleteExpenseItem(x.id, x.amount)}
                              title="حذف هذا القيد"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* FINANCIAL SUMMARY TOTAL */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 30 }}>
                <div style={{ width: 300, border: "1.5px solid #000", borderRadius: 6, padding: "10px 16px", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>إجمالي تكلفة تشغيل المعدة:</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#b91c1c" }}>
                      {formatCurrency(statementExpenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* SIGNATURES */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center", marginTop: 30, borderTop: "1px dashed #94a3b8", paddingTop: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800 }}>مسؤول الحركة والمعدات</div>
                  <div style={{ height: 35 }}></div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>التوقيع: .....................</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 800 }}>سائق / مشغل المعدة</div>
                  <div style={{ height: 35 }}></div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>التوقيع: .....................</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 800 }}>اعتماد الإدارة المالية</div>
                  <div style={{ height: 35 }}></div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>الختم والتوقيع: .....................</div>
                </div>
              </div>
            </div>

            <div className="modal-footer no-print">
              <button type="button" className="btn btn-ghost" onClick={() => setShowStatementModal(false)}>إغلاق</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowStatementModal(false);
                  setSelectedEqId(activeEquipmentForStatement.id);
                  setExpProjectId(activeEquipmentForStatement.assignedProjectId || projects[0]?.id || "");
                  setShowExpModal(true);
                }}
              >
                + تسجيل مصروف جديد لهذه المعدة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
