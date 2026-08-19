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
      const statusText = "⏳ بانتظار الاعتماد والترحيل";
      const metaNotes = `[meta:supervisor=${modalSupervisorName}|targetCategory=مصروف موقع عام|targetName=|paidBy=المشرف / عهدة الموقع|paymentMethod=نقدي|status=${statusText}|statement=${modalStatement}] ${modalNotes}`.trim();
      const formattedDesc = `${modalStatement ? modalStatement + " - " : ""}${modalSupervisorName ? "المشرف: " + modalSupervisorName + " | " : ""}${modalNotes}`;

      const payload = {
        projectId: modalProjectId,
        type: "مواد",
        amount: parseFloat(modalAmount),
        description: modalStatement || formattedDesc,
        notes: metaNotes,
        date: new Date(modalDate).toISOString(),
      };

      const { error } = await supabase.from("ProjectExpense").insert([payload]);
      if (error) throw error;

      showToast("تم تسجيل المصروف بنجاح وهو بانتظار توجيه الترحيل من الإدارة ⏳", "success");
      setShowQuickModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ المصروف", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Manager Routing & Posting Modal State
  const [postingExp, setPostingExp] = useState<ProjectExpense | null>(null);
  const [postTargetCategory, setPostTargetCategory] = useState("مقاول باطن");
  const [postTargetName, setPostTargetName] = useState("");
  const [postType, setPostType] = useState("مواد");
  const [postPaymentMethod, setPostPaymentMethod] = useState("نقدي");
  const [postNotes, setPostNotes] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const openPostingModal = (exp: ProjectExpense) => {
    setPostingExp(exp);
    setPostTargetCategory(exp.targetCategory && exp.targetCategory !== "مصروف موقع عام" ? exp.targetCategory : "مقاول باطن");
    setPostTargetName(exp.targetName || "");
    setPostType(exp.type || "مواد");
    setPostPaymentMethod(exp.paymentMethod || "نقدي");
    setPostNotes(exp.notes || "");
  };

  const handleConfirmPosting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postingExp) return;

    if (postTargetCategory === "مقاول باطن" && !postTargetName.trim()) {
      showToast("برجاء اختيار المقاول لترحيل المصروف لحسابه", "warning");
      return;
    }

    if (postTargetCategory === "عامل موقع" && !postTargetName.trim()) {
      showToast("برجاء اختيار العامل لترحيل السلفة لحسابه", "warning");
      return;
    }

    setIsPosting(true);
    try {
      const newStatus = "✅ معتمد ومرحل";
      const metaNotes = `[meta:supervisor=${postingExp.supervisorName || ""}|targetCategory=${postTargetCategory}|targetName=${postTargetName}|paidBy=${postingExp.paidBy || "المشرف / عهدة الموقع"}|paymentMethod=${postPaymentMethod}|status=${newStatus}|statement=${postingExp.statement || postingExp.description}] ${postNotes}`.trim();

      const { error } = await supabase
        .from("ProjectExpense")
        .update({
          type: postType,
          notes: metaNotes,
        })
        .eq("id", postingExp.id);

      if (error) throw error;

      // Post to Subcontractor if target is Subcontractor
      if (postTargetCategory === "مقاول باطن" && postTargetName) {
        const { data: subData } = await supabase.from("Subcontractor").select("id").eq("name", postTargetName).single();
        if (subData) {
          await supabase.from("SubcontractorDoc").insert([
            {
              subcontractorId: subData.id,
              projectId: postingExp.projectId,
              type: "دفعة / مصروف",
              description: `مصروف موقع مرحل من المشرف (${postingExp.supervisorName || "المشرف"}): ${postingExp.statement || postingExp.description}`,
              amount: postingExp.amount,
              status: "مدفوع",
              date: postingExp.date,
            },
          ]);
        }
      }

      // Post to Worker if target is Worker
      if (postTargetCategory === "عامل موقع" && postTargetName) {
        const { data: workData } = await supabase.from("Worker").select("id").eq("name", postTargetName).single();
        if (workData) {
          await supabase.from("WorkerAdvance").insert([
            {
              workerId: workData.id,
              amount: postingExp.amount,
              status: "مدفوع",
              notes: `سلفة / مصروف موقع مرحل من المشرف (${postingExp.supervisorName || "المشرف"}): ${postingExp.statement || postingExp.description}`,
              date: postingExp.date,
            },
          ]);
        }
      }

      showToast("تم توجيه واعتماد وترحيل المصروف بنجاح إلى كافة الحسابات ✅", "success");
      setPostingExp(null);
      fetchData();
    } catch (e: any) {
      showToast(e.message || "فشل في ترحيل المصروف", "error");
    } finally {
      setIsPosting(false);
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
          ⏳ بانتظار توجيه الترحيل ({pendingList.length})
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
                  <th>جهة وتوجيه الترحيل</th>
                  <th>السبب والبيان</th>
                  <th>المبلغ</th>
                  <th style={{ textAlign: "center" }}>حالة الاعتماد والترحيل</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>إجراء وتوجيه الإدارة</th>
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
                        <span className={`badge ${isPending ? "badge-warning" : "badge-info"}`}>
                          {exp.targetCategory || "مصروف عام"} {exp.targetName ? `(${exp.targetName})` : ""}
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
                          {isPending ? (
                            <button
                              onClick={() => openPostingModal(exp)}
                              className="btn btn-primary btn-sm"
                              style={{ background: "#2563eb", borderColor: "#2563eb", padding: "4px 10px", fontSize: 11, fontWeight: 800 }}
                              title="توجيه وترحيل المصروف لحسابات المقاولين أو العهد"
                            >
                              🔄 توجيه وترحيل المصروف
                            </button>
                          ) : (
                            <button
                              onClick={() => openPostingModal(exp)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                              title="تعديل توجيه الترحيل"
                            >
                              ⚙️ تعديل الترحيل
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

      {/* MODAL 1: MANAGER ROUTING & POSTING MODAL (توجيه وترحيل المصروف لحسابات الشركة) */}
      {postingExp && (
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
              maxWidth: 600,
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
                <span>💼</span>
                <span>توجيه وترحيل المصروف (خاص بالإدارة)</span>
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPostingExp(null)}
                style={{ fontSize: 18, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* EXPENSE SUMMARY BOX */}
            <div
              style={{
                background: "hsl(var(--bg-card))",
                border: "1px solid hsl(var(--border-subtle))",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>
                  🏗️ المشروع: <strong>{postingExp.project?.name || "المشروع"}</strong> | 👔 المشرف: <strong>{postingExp.supervisorName}</strong>
                </span>
                <span style={{ fontSize: 12, color: "hsl(var(--text-muted))" }}>📅 {formatDateShort(postingExp.date)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>📝 {postingExp.statement || postingExp.description}</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#ef4444" }}>{formatCurrency(postingExp.amount)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPosting}>
              {/* TARGET CATEGORY ROUTING */}
              <div
                style={{
                  background: "hsl(var(--bg-card))",
                  border: "1px solid hsl(var(--border-subtle))",
                  borderRadius: 12,
                  padding: "16px",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: "hsl(var(--gold))" }}>
                  🔄 حدد جهة الترحيل المحاسبي للمصروف:
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>نوع وتوجيه الحساب *</label>
                  <select
                    className="form-control"
                    value={postTargetCategory}
                    onChange={(e) => {
                      setPostTargetCategory(e.target.value);
                      setPostTargetName("");
                    }}
                  >
                    <option value="مقاول باطن">🏗️ لمقاول باطن (ترحيل دفعة لحساب المقاول)</option>
                    <option value="عامل موقع">👷 لعامل موقع (ترحيل سلفة لحساب العامل)</option>
                    <option value="مشرف موقع">👔 عهدة مشرف موقع (تصفية عهدة الإشراف)</option>
                    <option value="خامات ومصروف موقع">📦 خامات ومصروف موقع عام (مباشر على المشروع)</option>
                  </select>
                </div>

                {postTargetCategory === "مقاول باطن" ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>اختر المقاول الفرعي *</label>
                    <input
                      type="text"
                      list="admin-post-subs-list"
                      className="form-control"
                      placeholder="ابحث أو اختر اسم المقاول..."
                      required
                      value={postTargetName}
                      onChange={(e) => setPostTargetName(e.target.value)}
                    />
                    <datalist id="admin-post-subs-list">
                      {subcontractors.map((s) => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                  </div>
                ) : postTargetCategory === "عامل موقع" ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>اختر عامل الموقع *</label>
                    <input
                      type="text"
                      list="admin-post-workers-list"
                      className="form-control"
                      placeholder="ابحث أو اختر اسم العامل..."
                      required
                      value={postTargetName}
                      onChange={(e) => setPostTargetName(e.target.value)}
                    />
                    <datalist id="admin-post-workers-list">
                      {workers.map((w) => (
                        <option key={w.id} value={w.name} />
                      ))}
                    </datalist>
                  </div>
                ) : postTargetCategory === "مشرف موقع" ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>المشرف المسجل للعهدة *</label>
                    <input
                      type="text"
                      list="admin-post-sups-list"
                      className="form-control"
                      placeholder="اسم المشرف..."
                      value={postTargetName || postingExp.supervisorName || ""}
                      onChange={(e) => setPostTargetName(e.target.value)}
                    />
                    <datalist id="admin-post-sups-list">
                      {supervisors.map((s) => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">البيان / المورد (اختياري)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="مثال: شركة الأسمنت، نقل مخلفات..."
                      value={postTargetName}
                      onChange={(e) => setPostTargetName(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* PAYMENT DETAILS */}
              <div className="grid-2" style={{ gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>تصنيف المصروف</label>
                  <select className="form-control" value={postType} onChange={(e) => setPostType(e.target.value)}>
                    <option value="مواد">مواد وخامات</option>
                    <option value="عمالة">عمالة ومستحقات</option>
                    <option value="نقل">نقل وتشوين</option>
                    <option value="إيجار معدات">إيجار معدات وآليات</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>طريقة الدفع</label>
                  <select className="form-control" value={postPaymentMethod} onChange={(e) => setPostPaymentMethod(e.target.value)}>
                    <option value="نقدي">نقدي (من عهدة المشرف)</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="شيك بنكي">شيك بنكي</option>
                    <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label" style={{ fontSize: 12 }}>ملاحظات المحاسب / الإدارة</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ملاحظات توثيقية أو رقم السند..."
                  value={postNotes}
                  onChange={(e) => setPostNotes(e.target.value)}
                />
              </div>

              {/* BUTTONS */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPostingExp(null)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "8px 24px", background: "#10b981", borderColor: "#10b981" }}
                  disabled={isPosting}
                >
                  {isPosting ? <span className="spinner" /> : "🚀 اعتماد وتأكيد ترحيل الحسابات فوراً"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUPERVISOR SIMPLE SITE EXPENSE ENTRY (تسجيل مصروف موقع جديد) */}
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
              maxWidth: 560,
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
              {/* PROJECT & SUPERVISOR */}
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

              {/* CORE 3 FIELDS HIGHLIGHTED: DATE - AMOUNT - REASON */}
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
                    📝 السبب (سبب وبيان المصروف بالتفصيل) *
                  </label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="اكتب سبب وبيان المصروف بالتفصيل..."
                    required
                    value={modalStatement}
                    onChange={(e) => setModalStatement(e.target.value)}
                  />
                </div>
              </div>

              {/* NOTES */}
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label" style={{ fontSize: 12 }}>ملاحظات إضافية / رقم الفاتورة (اختياري)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="رقم الفاتورة أو ملاحظات..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                />
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
                  style={{ padding: "8px 24px" }}
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? <span className="spinner" /> : "💸 تسجيل المصروف وإرساله للإدارة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
