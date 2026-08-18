import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface GeneralExpense {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  targetCategory?: string; // "company", "employee", "subcontractor", "project"
  targetName?: string;
  targetId?: string;
  notes?: string;
}

interface Employee {
  id: string;
  name: string;
  code: string;
  jobRole: string;
}

interface Subcontractor {
  id: string;
  name: string;
  specialty?: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

export default function GeneralExpensesPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GeneralExpense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [type, setType] = useState("إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Posting Target State (عن حساب مين؟)
  const [targetCategory, setTargetCategory] = useState<"company" | "employee" | "subcontractor" | "project">("company");
  const [targetId, setTargetId] = useState("");
  const [notes, setNotes] = useState("");

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [gRes, empRes, subRes, projRes] = await Promise.all([
        supabase.from("GeneralExpense").select("*").order("date", { ascending: false }),
        supabase.from("Employee").select("id, name, code, jobRole").order("name", { ascending: true }),
        supabase.from("Subcontractor").select("id, name, specialty").order("name", { ascending: true }),
        supabase.from("Project").select("id, name, code").order("name", { ascending: true }),
      ]);

      if (gRes.data) {
        const processed = gRes.data.map((exp: any) => {
          let paymentMethod = "نقدي";
          let targetCategory = "company";
          let targetId = "";
          let targetName = "";
          let cleanNotes = exp.notes || "";

          if (exp.notes && exp.notes.includes("[meta:")) {
            const pmMatch = exp.notes.match(/paymentMethod=([^\|\]]+)/);
            if (pmMatch) paymentMethod = pmMatch[1];
            const tcMatch = exp.notes.match(/targetCategory=([^\|\]]+)/);
            if (tcMatch) targetCategory = tcMatch[1];
            const tiMatch = exp.notes.match(/targetId=([^\|\]]+)/);
            if (tiMatch) targetId = tiMatch[1];
            const tnMatch = exp.notes.match(/targetName=([^\|\]]+)/);
            if (tnMatch) targetName = tnMatch[1];
            cleanNotes = exp.notes.replace(/\[meta:[^\]]+\]/, "").trim();
          }

          return {
            ...exp,
            paymentMethod,
            targetCategory,
            targetId,
            targetName,
            notes: cleanNotes,
          };
        });
        setExpenses(processed);
      }

      if (empRes.data) setEmployees(empRes.data);
      if (subRes.data) setSubcontractors(subRes.data);
      if (projRes.data) setProjects(projRes.data);
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل بيانات المصروفات العامة", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const resetForm = () => {
    setType("إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)");
    setPaymentMethod("نقدي");
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setTargetCategory("company");
    setTargetId("");
    setNotes("");
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (item: GeneralExpense) => {
    setEditingItem(item);
    setType(item.type || "إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)");
    setPaymentMethod(item.paymentMethod || "نقدي");
    setDescription(item.description || "");
    setAmount(item.amount?.toString() || "");
    setDate(item.date ? new Date(item.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setTargetCategory((item.targetCategory as any) || "company");
    setTargetId(item.targetId || "");
    setNotes(item.notes || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      showToast("برجاء إدخال بيان المصروف والمبلغ", "warning");
      return;
    }

    const numericAmount = parseFloat(amount) || 0;
    let targetName = "";

    if (targetCategory === "employee") {
      const foundEmp = employees.find((e) => e.id === targetId);
      targetName = foundEmp ? foundEmp.name : "موظف";
    } else if (targetCategory === "subcontractor") {
      const foundSub = subcontractors.find((s) => s.id === targetId);
      targetName = foundSub ? foundSub.name : "مقاول باطن";
    } else if (targetCategory === "project") {
      const foundProj = projects.find((p) => p.id === targetId);
      targetName = foundProj ? foundProj.name : "مشروع";
    }

    setSubmitting(true);
    try {
      const metaStr = `[meta:paymentMethod=${paymentMethod}|targetCategory=${targetCategory}|targetId=${targetId}|targetName=${targetName}] ${notes}`.trim();

      const payload = {
        type,
        description: `${description}${targetName ? " (عن حساب: " + targetName + ")" : ""}`,
        amount: numericAmount,
        date: new Date(date).toISOString(),
        notes: metaStr,
      };

      if (editingItem) {
        const { error } = await supabase.from("GeneralExpense").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        showToast("تم تحديث المصروف العام بنجاح ✅", "success");
      } else {
        const { error } = await supabase.from("GeneralExpense").insert([payload]);
        if (error) throw error;

        // AUTOMATIC LEDGER POSTING AUTOMATION (التسميع التلقائي في الدفاتر)
        if (targetCategory === "employee" && targetId) {
          // 1. Post to Employee Advances / Deductions
          const advancePayload = {
            workerId: targetId,
            amount: numericAmount,
            date: new Date(date).toISOString(),
            notes: `استقطاع مصروف عام (${type}): ${description}`,
          };
          try {
            await supabase.from("WorkerAdvance").insert([advancePayload]);
          } catch (e) {}

          const localA = localStorage.getItem(`emp_advances_${targetId}`);
          const parsedA = localA ? JSON.parse(localA) : [];
          localStorage.setItem(`emp_advances_${targetId}`, JSON.stringify([{ ...advancePayload, id: "adv-" + Date.now() }, ...parsedA]));
          showToast(`تم تسميع الخصم/السلفة بنجاح في كشف حساب الموظف (${targetName}) 👷✅`, "success");
        } else if (targetCategory === "subcontractor" && targetId) {
          // 2. Post to Subcontractor Ledger / Payment Deductions
          const subDocPayload = {
            subcontractorId: targetId,
            type: "خصم / مصروف عام",
            description: `خصم مصروف عام (${type}): ${description}`,
            amount: numericAmount,
            status: "مخصوم",
            date: new Date(date).toISOString(),
          };
          try {
            await supabase.from("SubcontractorDoc").insert([subDocPayload]);
          } catch (e) {}

          const localS = localStorage.getItem(`sub_payments_${targetId}`);
          const parsedS = localS ? JSON.parse(localS) : [];
          localStorage.setItem(`sub_payments_${targetId}`, JSON.stringify([{ ...subDocPayload, id: "subdoc-" + Date.now() }, ...parsedS]));
          showToast(`تم تسميع الاستقطاع بنجاح في كشف حساب مقاول الباطن (${targetName}) 🤝✅`, "success");
        } else if (targetCategory === "project" && targetId) {
          // 3. Post to Project Expense
          try {
            await supabase.from("ProjectExpense").insert([
              {
                projectId: targetId,
                type: "مصروف إداري بالموقع",
                amount: numericAmount,
                description: `مصروف عام إداري: ${description}`,
                notes: `[meta:supervisor=الإدارة|targetCategory=مصروف عام|status=✅ معتمد ومرحل] ${notes}`,
                date: new Date(date).toISOString(),
              },
            ]);
          } catch (e) {}
          showToast(`تم تصفية المصروف وتسميعه في تكاليف المشروع (${targetName}) 🏗️✅`, "success");
        } else {
          showToast("تم تسجيل المصروف العام على إداريات الشركة بنجاح ✅", "success");
        }
      }

      setShowModal(false);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ المصروف العام", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, amountText: string) => {
    if (!confirm(`هل أنت متأكد من حذف هذا المصروف بقيمة (${amountText})؟`)) return;
    try {
      const { error } = await supabase.from("GeneralExpense").delete().eq("id", id);
      if (error) throw error;
      showToast("تم الحذف بنجاح ✅", "success");
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const filtered = expenses.filter((exp) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      exp.description.toLowerCase().includes(s) ||
      exp.type.toLowerCase().includes(s) ||
      (exp.targetName && exp.targetName.toLowerCase().includes(s));
    const matchType = !typeFilter || exp.type === typeFilter;
    const matchTarget = !targetFilter || exp.targetCategory === targetFilter;

    return matchSearch && matchType && matchTarget;
  });

  const totalAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* PAGE HEADER */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🧾 المصروفات العامة والإدارية والتسميع المالي</h1>
          <p className="page-subtitle">تسجيل فواتير الشركة، الإيجارات، المرافق، وتسميع الخصومات على الموظفين والمقاولين تلقائياً</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + تسجيل مصروف عام جديد
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة السجل
          </button>
        </div>
      </div>

      {/* SUMMARY STATS BAR */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>إجمالي المصروفات العامة المعروضة: </span>
            <strong style={{ fontSize: 20, color: "#ef4444", marginRight: 8 }}>{formatCurrency(totalAmount)}</strong>
          </div>
          <div>
            <span className="badge badge-info" style={{ fontSize: 12 }}>
              عدد الفواتير والعمليات: {filtered.length}
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 بحث بالبيان، الموظف، أو المقاول..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select className="form-control" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">-- جميع أنواع المصروفات --</option>
            <option value="إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)">إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)</option>
            <option value="إيجار مقر الشركة">إيجار مقر الشركة</option>
            <option value="رواتب ونثريات إدارية">رواتب ونثريات إدارية</option>
            <option value="أدوات مكتبية ومطبوعات">أدوات مكتبية ومطبوعات</option>
            <option value="اتصالات وإنترنت">اتصالات وإنترنت</option>
            <option value="صيانة وتجهيزات">صيانة وتجهيزات مقر</option>
            <option value="أخرى">أخرى</option>
          </select>

          <select className="form-control" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
            <option value="">-- جهة التسميع (الكل) --</option>
            <option value="company">🏢 مصروف عام على الشركة</option>
            <option value="employee">👷 خصم على موظف / مشرف</option>
            <option value="subcontractor">🤝 خصم على مقاول باطن</option>
            <option value="project">🏗️ محمل على مشروع</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل المصروفات...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🧾</div>
              <div className="empty-state-text">
                {searchTerm || typeFilter || targetFilter ? "لا توجد نتائج تطابق البحث والتصفية" : "لم يتم تسجيل مصروفات عامة بعد"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + تسجيل أول مصروف عام
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>نوع المصروف</th>
                  <th>البيان والتفاصيل</th>
                  <th>جهة تحميل وتسميع المصروف</th>
                  <th>طريقة الدفع</th>
                  <th>المبلغ (جنيه)</th>
                  <th>ملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp, idx) => (
                  <tr key={exp.id}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "hsl(var(--text-muted))" }}>{idx + 1}</td>
                    <td>{formatDateShort(exp.date)}</td>
                    <td><span className="badge badge-info">{exp.type}</span></td>
                    <td style={{ fontWeight: 700 }}>{exp.description}</td>
                    <td>
                      {exp.targetCategory === "employee" ? (
                        <span className="badge badge-warning">👷 موظف: {exp.targetName || "محدد"} (خصم)</span>
                      ) : exp.targetCategory === "subcontractor" ? (
                        <span className="badge badge-warning">🤝 مقاول: {exp.targetName || "محدد"} (خصم)</span>
                      ) : exp.targetCategory === "project" ? (
                        <span className="badge badge-success">🏗️ مشروع: {exp.targetName || "محدد"}</span>
                      ) : (
                        <span className="badge badge-ghost">🏢 شركة (مصروف عام)</span>
                      )}
                    </td>
                    <td><span className="badge badge-ghost">{exp.paymentMethod || "نقدي"}</span></td>
                    <td className="text-danger" style={{ fontWeight: 900, fontSize: 15 }}>{formatCurrency(exp.amount)}</td>
                    <td>{exp.notes || "-"}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button onClick={() => handleOpenEdit(exp)} className="btn-icon-centered" title="تعديل">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(exp.id, formatCurrency(exp.amount))} className="btn-icon-centered text-danger" title="حذف">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD / EDIT GENERAL EXPENSE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? "✏️ تعديل مصروف عام وإداري" : "🧾 تسجيل مصروف عام وإداري جديد"}</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input type="date" className="form-control" required value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">طريقة الدفع *</label>
                    <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="نقدي">نقدي (خزينة المقر)</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="شيك بنكي">شيك بنكي</option>
                      <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">نوع المصروف *</label>
                    <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)">إيجار ومرافق (كهرباء/مياه/غاز/شقة سكنية)</option>
                      <option value="إيجار مقر الشركة">إيجار مقر الشركة الرئيسي</option>
                      <option value="رواتب ونثريات إدارية">رواتب ونثريات إدارية وضيافة</option>
                      <option value="أدوات مكتبية ومطبوعات">أدوات مكتبية ومطبوعات</option>
                      <option value="اتصالات وإنترنت">اتصالات وإنترنت</option>
                      <option value="صيانة وتجهيزات">صيانة وتجهيزات المقر</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">القيمة / المبلغ (جنيه) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* TARGET LEDGER SELECTION (جهة تحميل المصروف والتسميع) */}
                <div style={{ background: "hsl(var(--bg-elevated))", padding: 14, borderRadius: 12, border: "1px solid hsl(var(--border-subtle))", margin: "10px 0 16px 0" }}>
                  <label className="form-label" style={{ fontWeight: 800, color: "hsl(var(--gold))", marginBottom: 8, display: "block" }}>
                    🎯 جهة تحميل المصروف والتسميع التلقائي في الحسابات:
                  </label>

                  <div className="grid-2" style={{ gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <select
                        className="form-control"
                        value={targetCategory}
                        onChange={(e) => {
                          setTargetCategory(e.target.value as any);
                          setTargetId("");
                        }}
                      >
                        <option value="company">🏢 مصروف عام إداري على الشركة</option>
                        <option value="employee">👷 عن حساب موظف / مشرف (سلفة / خصم)</option>
                        <option value="subcontractor">🤝 عن حساب مقاول باطن (خصم مستخلص)</option>
                        <option value="project">🏗️ عن حساب مشروع محدد</option>
                      </select>
                    </div>

                    {/* DYNAMIC SECONDARY SELECTOR DEPENDING ON TARGET CATEGORY */}
                    {targetCategory === "employee" && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <select className="form-control" required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                          <option value="" disabled>-- اختر الموظف / المشرف --</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobRole} - {emp.code})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {targetCategory === "subcontractor" && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <select className="form-control" required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                          <option value="" disabled>-- اختر مقاول الباطن --</option>
                          {subcontractors.map((sub) => (
                            <option key={sub.id} value={sub.id}>{sub.name} ({sub.specialty || "مقاول"})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {targetCategory === "project" && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <select className="form-control" required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                          <option value="" disabled>-- اختر المشروع --</option>
                          {projects.map((proj) => (
                            <option key={proj.id} value={proj.id}>{proj.name} ({proj.code})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">البيان والشرح التفصيلي *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: فاتورة كهرباء وتجهيز سكن، إيجار شقة..."
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات أو رقم الفاتورة</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="أي ملاحظات إضافية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : editingItem ? "💾 حفظ التعديلات" : "🧾 تسجيل المصروف والترحيل الآلي"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
