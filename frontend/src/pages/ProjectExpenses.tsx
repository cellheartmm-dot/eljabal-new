import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface ProjectExpense {
  id: string;
  projectId: string;
  project?: { id: string; name: string; code: string };
  type: string;
  description: string;
  amount: number;
  supervisorName?: string;
  targetCategory?: string;
  targetName?: string;
  paidBy?: string;
  paymentMethod?: string;
  status: string; // "⏳ بانتظار الاعتماد والترحيل" or "✅ معتمد ومرحل"
  statement?: string;
  notes?: string;
  date: string;
  createdAt?: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

interface Supervisor {
  id: string;
  name: string;
}

interface Subcontractor {
  id: string;
  name: string;
}

interface Worker {
  id: string;
  name: string;
}

export default function ProjectExpensesPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("all"); // "all", "pending", "approved"
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Quick Expense Modal State
  const getTodayDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [showQuickModal, setShowQuickModal] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalDate, setModalDate] = useState(getTodayDate());
  const [modalAmount, setModalAmount] = useState("");
  const [modalStatement, setModalStatement] = useState("");
  const [modalProjectId, setModalProjectId] = useState("");
  const [modalSupervisorName, setModalSupervisorName] = useState("");
  const [modalTargetCategory, setModalTargetCategory] = useState("مقاول باطن");
  const [modalTargetName, setModalTargetName] = useState("");
  const [modalType, setModalType] = useState("مواد");
  const [modalPaymentMethod, setModalPaymentMethod] = useState("نقدي");
  const [modalNotes, setModalNotes] = useState("");
  const [modalAutoApprove, setModalAutoApprove] = useState(true);

  const openNewExpenseModal = (defaultProjId?: string) => {
    setModalDate(getTodayDate());
    setModalAmount("");
    setModalStatement("");
    setModalProjectId(defaultProjId || (projects.length > 0 ? projects[0].id : ""));
    setModalSupervisorName(supervisors.length > 0 ? supervisors[0].name : "");
    setModalTargetCategory("مقاول باطن");
    setModalTargetName("");
    setModalType("مواد");
    setModalPaymentMethod("نقدي");
    setModalNotes("");
    setModalAutoApprove(true);
    setShowQuickModal(true);
  };


  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, projRes, supRes, subRes, workRes] = await Promise.all([
        supabase
          .from("ProjectExpense")
          .select("*, project:Project(id, code, name)")
          .order("createdAt", { ascending: false }),
        supabase.from("Project").select("id, code, name").order("name", { ascending: true }),
        supabase.from("Supervisor").select("id, name").order("name", { ascending: true }),
        supabase.from("Subcontractor").select("id, name").order("name", { ascending: true }),
        supabase.from("Worker").select("id, name").order("name", { ascending: true }),
      ]);

      if (expRes.error) throw expRes.error;
      if (projRes.error) throw projRes.error;

      if (supRes.data) setSupervisors(supRes.data);
      if (subRes.data) setSubcontractors(subRes.data);
      if (workRes.data) setWorkers(workRes.data);

      // Parse metadata from notes
      const processed = (expRes.data || []).map((exp: any) => {
        let supervisorName = "مشرف الموقع";
        let targetCategory = "مصروف موقع عام";
        let targetName = "";
        let paidBy = "المشرف / عهدة الموقع";
        let paymentMethod = "نقدي";
        let status = "✅ معتمد ومرحل";
        let statement = exp.description || "";
        let cleanNotes = exp.notes || "";

        if (exp.notes && exp.notes.includes("[meta:")) {
          const supMatch = exp.notes.match(/supervisor=([^\|\]]+)/);
          if (supMatch) supervisorName = supMatch[1];
          const catMatch = exp.notes.match(/targetCategory=([^\|\]]+)/);
          if (catMatch) targetCategory = catMatch[1];
          const nameMatch = exp.notes.match(/targetName=([^\|\]]+)/);
          if (nameMatch) targetName = nameMatch[1];
          const pbMatch = exp.notes.match(/paidBy=([^\|\]]+)/);
          if (pbMatch) paidBy = pbMatch[1];
          const pmMatch = exp.notes.match(/paymentMethod=([^\|\]]+)/);
          if (pmMatch) paymentMethod = pmMatch[1];
          const stMatch = exp.notes.match(/status=([^\|\]]+)/);
          if (stMatch) status = stMatch[1];
          const stateMatch = exp.notes.match(/statement=([^\|\]]+)/);
          if (stateMatch) statement = stateMatch[1];

          cleanNotes = exp.notes.replace(/\[meta:[^\]]+\]/, "").trim();
        }

        return {
          ...exp,
          supervisorName,
          targetCategory,
          targetName,
          paidBy,
          paymentMethod,
          status,
          statement: statement || exp.description,
          notes: cleanNotes,
        };
      });

      setExpenses(processed);
      setProjects(projRes.data || []);
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل مصروفات المشرفين من Supabase", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAmount || parseFloat(modalAmount) <= 0) {
      showToast("برجاء إدخال مبلغ المصروف بشكل صحيح", "warning");
      return;
    }
    if (!modalStatement.trim()) {
      showToast("برجاء إدخال سبب وبيان المصروف", "warning");
      return;
    }
    if (!modalProjectId) {
      showToast("برجاء اختيار المشروع المسند إليه المصروف", "warning");
      return;
    }

    setModalSubmitting(true);
    try {
      const statusText = modalAutoApprove ? "✅ معتمد ومرحل" : "⏳ بانتظار الاعتماد والترحيل";
      const metaNotes = `[meta:supervisor=${modalSupervisorName}|targetCategory=${modalTargetCategory}|targetName=${modalTargetName}|paidBy=المشرف / عهدة الموقع|paymentMethod=${modalPaymentMethod}|status=${statusText}|statement=${modalStatement}] ${modalNotes}`.trim();
      const formattedDesc = `${modalStatement ? modalStatement + " - " : ""}${modalSupervisorName ? "المشرف: " + modalSupervisorName + " | " : ""}${modalTargetCategory ? "جهة المصروف: " + modalTargetCategory + " (" + modalTargetName + ") | " : ""}${modalNotes}`;

      const payload = {
        projectId: modalProjectId,
        type: modalType,
        amount: parseFloat(modalAmount),
        description: modalStatement || formattedDesc,
        notes: metaNotes,
        date: new Date(modalDate).toISOString(),
      };

      const { error } = await supabase.from("ProjectExpense").insert([payload]);
      if (error) throw error;

      // Auto-approve postings
      if (modalAutoApprove && modalTargetCategory === "مقاول باطن" && modalTargetName) {
        const matchedSub = subcontractors.find((s) => s.name === modalTargetName);
        if (matchedSub) {
          await supabase.from("SubcontractorDoc").insert([
            {
              subcontractorId: matchedSub.id,
              projectId: modalProjectId,
              type: "دفعة / مصروف",
              description: `مصروف موقع ممرر من المشرف: ${modalStatement || modalType}`,
              amount: parseFloat(modalAmount),
              status: "مدفوع",
              date: new Date(modalDate).toISOString(),
            },
          ]);
        }
      }

      if (modalAutoApprove && modalTargetCategory === "عامل موقع" && modalTargetName) {
        const matchedWork = workers.find((w) => w.name === modalTargetName);
        if (matchedWork) {
          await supabase.from("WorkerAdvance").insert([
            {
              workerId: matchedWork.id,
              amount: parseFloat(modalAmount),
              status: "مدفوع",
              notes: `سلفة / مصروف موقع ممرر من المشرف: ${modalStatement || modalType}`,
              date: new Date(modalDate).toISOString(),
            },
          ]);
        }
      }

      showToast(modalAutoApprove ? "تم تسجيل المصروف واعتماده وترحيله بنجاح ✅" : "تم تسجيل المصروف بنجاح ⏳", "success");
      setShowQuickModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ المصروف", "error");
    } finally {
      setModalSubmitting(false);
    }
  };


  // Admin Approve & Post Action
  const handleApproveAndPost = async (exp: ProjectExpense) => {
    if (!confirm(`هل تريد اعتماد وترحيل هذا المصروف بقيمة (${formatCurrency(exp.amount)}) وتمريره لحساب (${exp.targetCategory || "المشروع"})؟`)) return;

    setApprovingId(exp.id);
    try {
      const newStatus = "✅ معتمد ومرحل";
      const updatedNotes = `[meta:supervisor=${exp.supervisorName || ""}|targetCategory=${exp.targetCategory || ""}|targetName=${exp.targetName || ""}|paidBy=${exp.paidBy || ""}|paymentMethod=${exp.paymentMethod || ""}|status=${newStatus}|statement=${exp.statement || ""}] ${exp.notes || ""}`.trim();

      const { error } = await supabase
        .from("ProjectExpense")
        .update({ notes: updatedNotes })
        .eq("id", exp.id);

      if (error) throw error;

      // Post to Subcontractor if target is Subcontractor
      if (exp.targetCategory === "مقاول باطن" && exp.targetName) {
        const { data: subData } = await supabase.from("Subcontractor").select("id").eq("name", exp.targetName).single();
        if (subData) {
          await supabase.from("SubcontractorDoc").insert([
            {
              subcontractorId: subData.id,
              projectId: exp.projectId,
              type: "دفعة / مصروف",
              description: `مصروف ممرر ومرحل من المشرف (${exp.supervisorName}): ${exp.statement}`,
              amount: exp.amount,
              status: "مدفوع",
              date: exp.date,
            },
          ]);
        }
      }

      // Post to Worker if target is Worker
      if (exp.targetCategory === "عامل موقع" && exp.targetName) {
        const { data: workData } = await supabase.from("Worker").select("id").eq("name", exp.targetName).single();
        if (workData) {
          await supabase.from("WorkerAdvance").insert([
            {
              workerId: workData.id,
              amount: exp.amount,
              status: "مدفوع",
              notes: `سلفة / مصروف موقع مرحل من المشرف (${exp.supervisorName}): ${exp.statement}`,
              date: exp.date,
            },
          ]);
        }
      }

      showToast("تم اعتماد وترحيل المصروف بنجاح إلى كافة الحسابات المنسوبة ✅", "success");
      fetchData();
    } catch (e: any) {
      showToast(e.message || "فشل في اعتماد المصروف", "error");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async (id: string, amountText: string) => {
    if (!confirm(`هل أنت متأكد من حذف هذا المصروف بقيمة (${amountText})؟`)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("ProjectExpense").delete().eq("id", id);
      if (error) throw error;
      showToast("تم حذف المصروف بنجاح ✅", "success");
      fetchData();
    } catch (e: any) {
      showToast(e.message || "فشل في حذف المصروف", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter Lists
  const pendingList = expenses.filter((e) => e.status.includes("بانتظار"));
  const approvedList = expenses.filter((e) => e.status.includes("معتمد"));

  const currentTabList = activeTab === "pending" ? pendingList : activeTab === "approved" ? approvedList : expenses;

  const filteredExpenses = currentTabList.filter((exp) => {
    const matchesProject = !projectFilter || exp.projectId === projectFilter;
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      exp.description.toLowerCase().includes(s) ||
      (exp.project?.name && exp.project.name.toLowerCase().includes(s)) ||
      (exp.supervisorName && exp.supervisorName.toLowerCase().includes(s)) ||
      (exp.targetName && exp.targetName.toLowerCase().includes(s)) ||
      (exp.notes && exp.notes.toLowerCase().includes(s));

    return matchesProject && matchesSearch;
  });

  const totalAmountFiltered = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">💸 مصروفات المشرفين وسجلات الموقع (الاعتماد والترحيل)</h1>
          <p className="page-subtitle">
            مراجعة المصروفات المرفوعة من المشرفين بالمواقع، اعتمادها، وترحيلها تلقائياً لحسابات المقاولين والعمال والمشاريع
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => openNewExpenseModal()} className="btn btn-primary">
            💸 + تسجيل مصروف موقع جديد
          </button>
          <Link to="/project-expenses/create" className="btn btn-outline-primary" style={{ border: "1px solid hsl(var(--border-subtle))" }}>
            📝 صفحة التسجيل الكاملة
          </Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة السجل
          </button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="print:hidden" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("all")}
          className={`btn ${activeTab === "all" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: 13 }}
        >
          📋 جميع المصروفات ({expenses.length})
        </button>

        <button
          onClick={() => setActiveTab("pending")}
          className={`btn ${activeTab === "pending" ? "btn-primary" : "btn-ghost"}`}
          style={{
            fontSize: 13,
            background: activeTab === "pending" ? "#f59e0b" : "hsl(var(--bg-elevated))",
            color: activeTab === "pending" ? "#000" : "hsl(var(--text-primary))",
            fontWeight: 800,
          }}
        >
          ⏳ بانتظار الاعتماد والترحيل ({pendingList.length})
        </button>

        <button
          onClick={() => setActiveTab("approved")}
          className={`btn ${activeTab === "approved" ? "btn-primary" : "btn-ghost"}`}
          style={{ fontSize: 13 }}
        >
          ✅ معتمدة ومرحلة ({approvedList.length})
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث باسم المشرف، المقاول، الشرح أو البيان</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث هنا..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>🏗️ التصفية حسب المشروع</label>
            <select
              className="form-control"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">جميع المشاريع</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card">
        <div className="card-header" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>سجل المصروفات المرفوعة من مواقع العمل</h3>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#ef4444" }}>
            إجمالي القيمة: {formatCurrency(totalAmountFiltered)}
          </span>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل مصروفات المشرفين...</div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💸</div>
              <div className="empty-state-text">لا توجد مصروفات تطابق اختيارات البحث الحالية</div>
              <button onClick={() => openNewExpenseModal()} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                + تسجيل مصروف موقع جديد
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>المشرف القائم بالصرف</th>
                  <th>المشروع المسند</th>
                  <th>جهة / سبب المصروف (التسميع)</th>
                  <th>البيان والشرح</th>
                  <th>المبلغ</th>
                  <th style={{ textAlign: "center" }}>حالة الاعتماد والترحيل</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات والاعتماد</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp, idx) => {
                  const isPending = exp.status.includes("بانتظار");
                  return (
                    <tr key={exp.id}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>{idx + 1}</td>
                      <td>{formatDateShort(exp.date)}</td>
                      <td style={{ fontWeight: 700 }}>{exp.supervisorName || "مشرف موقع"}</td>
                      <td>
                        {exp.project ? (
                          <Link to={`/projects/${exp.project.id}`} style={{ color: "hsl(var(--primary))", fontWeight: 700 }}>
                            {exp.project.name}
                          </Link>
                        ) : "-"}
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {exp.targetCategory} {exp.targetName ? `(${exp.targetName})` : ""}
                        </span>
                      </td>
                      <td style={{ maxWidth: 220 }}>{exp.statement || exp.description}</td>
                      <td className="text-danger" style={{ fontWeight: 900, fontSize: 15 }}>{formatCurrency(exp.amount)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${isPending ? "badge-warning" : "badge-success"}`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="print:hidden" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          {isPending && (
                            <button
                              onClick={() => handleApproveAndPost(exp)}
                              disabled={approvingId === exp.id}
                              className="btn btn-primary btn-sm"
                              style={{ background: "#10b981", borderColor: "#10b981", padding: "4px 8px", fontSize: 11 }}
                              title="اعتماد وتمرير المصروف"
                            >
                              {approvingId === exp.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "✅ اعتماد وترحيل"}
                            </button>
                          )}
                          <Link to={`/project-expenses/create?edit=${exp.id}`} className="btn-icon-centered" title="تعديل">
                            ✏️
                          </Link>
                          <button
                            onClick={() => handleDelete(exp.id, formatCurrency(exp.amount))}
                            disabled={deletingId === exp.id}
                            className="btn-icon-centered text-danger"
                            title="حذف"
                          >
                            {deletingId === exp.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "🗑️"}
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

      {/* QUICK EXPENSE MODAL (تسجيل مصروف موقع جديد) */}
      {showQuickModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              borderRadius: 16,
              background: "hsl(var(--bg-elevated))",
              border: "1px solid hsl(var(--border-subtle))",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span>💸</span>
                <span>تسجيل مصروف موقع جديد (المشرفون)</span>
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowQuickModal(false)}
                style={{ fontSize: 18, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickSubmit}>
              {/* 1. CORE 3 FIELDS HIGHLIGHTED: DATE - AMOUNT - REASON */}
              <div
                style={{
                  background: "hsl(var(--bg-card))",
                  border: "1px solid hsl(var(--border-subtle))",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                  {/* DATE */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <label className="form-label" style={{ fontWeight: 800, fontSize: 12, margin: 0 }}>📅 التاريخ *</label>
                      <span className="badge badge-info" style={{ fontSize: 10 }}>تلقائي: اليوم</span>
                    </div>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                    />
                  </div>

                  {/* EXPENSE AMOUNT */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: "#ef4444", fontWeight: 900, fontSize: 12, marginBottom: 4 }}>
                      💸 المصروف (المبلغ بالجنيه) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      required
                      style={{ fontSize: 15, fontWeight: 800, color: "#ef4444" }}
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* REASON / STATEMENT */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
                    📝 السبب (سبب وبيان المصروف) *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="اكتب سبب وبيان المصروف بالتفصيل..."
                    required
                    value={modalStatement}
                    onChange={(e) => setModalStatement(e.target.value)}
                  />
                </div>
              </div>

              {/* 2. PROJECT & SUPERVISOR */}
              <div className="grid-2" style={{ gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>المشروع المسند إليه *</label>
                  <select
                    className="form-control"
                    required
                    value={modalProjectId}
                    onChange={(e) => setModalProjectId(e.target.value)}
                  >
                    <option value="" disabled>-- اختر المشروع --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: 12 }}>المشرف القائم بالصرف</label>
                  <input
                    type="text"
                    list="modal-supervisors-list"
                    className="form-control"
                    placeholder="اختر أو اكتب اسم المشرف..."
                    value={modalSupervisorName}
                    onChange={(e) => setModalSupervisorName(e.target.value)}
                  />
                  <datalist id="modal-supervisors-list">
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 3. TARGET CATEGORY ROUTING */}
              <div className="grid-2" style={{ gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>جهة التسميع والترحيل</label>
                  <select
                    className="form-control"
                    value={modalTargetCategory}
                    onChange={(e) => {
                      setModalTargetCategory(e.target.value);
                      setModalTargetName("");
                    }}
                  >
                    <option value="مقاول باطن">لمقاول باطن (ترحيل لحسابه)</option>
                    <option value="عامل موقع">لعامل موقع (ترحيل سلفة)</option>
                    <option value="مشرف موقع">لمشرف موقع (عهدة)</option>
                    <option value="خامات ومصروف موقع">خامات ومصروف عام</option>
                  </select>
                </div>

                {modalTargetCategory === "مقاول باطن" ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>اختر المقاول الفرعي</label>
                    <input
                      type="text"
                      list="modal-subs-list"
                      className="form-control"
                      placeholder="اسم المقاول..."
                      value={modalTargetName}
                      onChange={(e) => setModalTargetName(e.target.value)}
                    />
                    <datalist id="modal-subs-list">
                      {subcontractors.map((s) => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                  </div>
                ) : modalTargetCategory === "عامل موقع" ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>اختر عامل الموقع</label>
                    <input
                      type="text"
                      list="modal-workers-list"
                      className="form-control"
                      placeholder="اسم العامل..."
                      value={modalTargetName}
                      onChange={(e) => setModalTargetName(e.target.value)}
                    />
                    <datalist id="modal-workers-list">
                      {workers.map((w) => (
                        <option key={w.id} value={w.name} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>المستلم / الجهة</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="اسم الجهة أو المستلم..."
                      value={modalTargetName}
                      onChange={(e) => setModalTargetName(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* 4. AUTO APPROVE */}
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "hsl(var(--bg-card))", marginBottom: 18 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={modalAutoApprove}
                    onChange={(e) => setModalAutoApprove(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>✅ اعتماد وترحيل المصروف فورياً لحساب المستحق والمشروع</span>
                </label>
              </div>

              {/* BUTTONS */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowQuickModal(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "8px 20px" }}
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? <span className="spinner" /> : "💸 حفظ وتسجيل المصروف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
