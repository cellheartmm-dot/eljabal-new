import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";

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

export default function ProjectExpenseCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const editId = searchParams.get("edit");
  const defaultProjectId = searchParams.get("projectId") || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getTodayDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [date, setDate] = useState(getTodayDate());
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [supervisorName, setSupervisorName] = useState("");
  const [targetCategory, setTargetCategory] = useState("مقاول باطن"); // "مقاول باطن", "عامل موقع", "مشرف موقع", "خامات ومصروف موقع"
  const [targetName, setTargetName] = useState("");
  const [type, setType] = useState("مواد");
  const [paidBy, setPaidBy] = useState("المشرف / عهدة الموقع");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [statement, setStatement] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [autoApprove, setAutoApprove] = useState(true); // Admin option to auto-approve & post

  useEffect(() => {
    async function loadData() {
      try {
        const [projRes, supRes, subRes, workRes] = await Promise.all([
          supabase.from("Project").select("id, name, code").order("name", { ascending: true }),
          supabase.from("Supervisor").select("id, name").order("name", { ascending: true }),
          supabase.from("Subcontractor").select("id, name").order("name", { ascending: true }),
          supabase.from("Worker").select("id, name").order("name", { ascending: true }),
        ]);

        if (projRes.data) setProjects(projRes.data);
        if (supRes.data) setSupervisors(supRes.data);
        if (subRes.data) setSubcontractors(subRes.data);
        if (workRes.data) setWorkers(workRes.data);
      } catch (err: any) {
        showToast(err.message, "error");
      }

      if (editId) {
        setLoading(true);
        try {
          const { data: item, error } = await supabase
            .from("ProjectExpense")
            .select("*")
            .eq("id", editId)
            .single();

          if (error) throw error;
          if (item) {
            setDate(item.date ? new Date(item.date).toISOString().split("T")[0] : getTodayDate());
            setProjectId(item.projectId || "");
            setType(item.type || "مواد");
            setStatement(item.description || "");
            setAmount(item.amount?.toString() || "");

            // Extract metadata if exists
            if (item.notes && item.notes.includes("[meta:")) {
              const supMatch = item.notes.match(/supervisor=([^\|\]]+)/);
              if (supMatch) setSupervisorName(supMatch[1]);
              const catMatch = item.notes.match(/targetCategory=([^\|\]]+)/);
              if (catMatch) setTargetCategory(catMatch[1]);
              const nameMatch = item.notes.match(/targetName=([^\|\]]+)/);
              if (nameMatch) setTargetName(nameMatch[1]);
              const pbMatch = item.notes.match(/paidBy=([^\|\]]+)/);
              if (pbMatch) setPaidBy(pbMatch[1]);
              const pmMatch = item.notes.match(/paymentMethod=([^\|\]]+)/);
              if (pmMatch) setPaymentMethod(pmMatch[1]);
              const cleanN = item.notes.replace(/\[meta:[^\]]+\]/, "").trim();
              setNotes(cleanN);
            } else {
              setNotes(item.notes || "");
            }
          }
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showToast("برجاء إدخال مبلغ المصروف بشكل صحيح", "warning");
      return;
    }

    if (!statement.trim()) {
      showToast("برجاء إدخال سبب وبيان المصروف", "warning");
      return;
    }

    if (!projectId) {
      showToast("برجاء اختيار المشروع المسند إليه المصروف", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const statusText = autoApprove ? "✅ معتمد ومرحل" : "⏳ بانتظار الاعتماد والترحيل";
      const metaNotes = `[meta:supervisor=${supervisorName}|targetCategory=${targetCategory}|targetName=${targetName}|paidBy=${paidBy}|paymentMethod=${paymentMethod}|status=${statusText}|statement=${statement}] ${notes}`.trim();
      const formattedDesc = `${statement ? statement + " - " : ""}${supervisorName ? "المشرف: " + supervisorName + " | " : ""}${targetCategory ? "جهة المصروف: " + targetCategory + " (" + targetName + ") | " : ""}${notes}`;

      const payload = {
        projectId,
        type,
        amount: parseFloat(amount),
        description: statement || formattedDesc,
        notes: metaNotes,
        date: new Date(date).toISOString(),
      };

      if (editId) {
        const { error } = await supabase.from("ProjectExpense").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("تم تحديث المصروف بنجاح ✅", "success");
      } else {
        const { error } = await supabase.from("ProjectExpense").insert([payload]);
        if (error) throw error;

        // If auto-approved and target is Subcontractor, insert into SubcontractorDoc
        if (autoApprove && targetCategory === "مقاول باطن" && targetName) {
          const matchedSub = subcontractors.find((s) => s.name === targetName);
          if (matchedSub) {
            await supabase.from("SubcontractorDoc").insert([
              {
                subcontractorId: matchedSub.id,
                projectId,
                type: "دفعة / مصروف",
                description: `مصروف موقع ممرر من المشرف: ${statement || type}`,
                amount: parseFloat(amount),
                status: "مدفوع",
                date: new Date(date).toISOString(),
              },
            ]);
          }
        }

        // If auto-approved and target is Worker, insert into WorkerAdvance
        if (autoApprove && targetCategory === "عامل موقع" && targetName) {
          const matchedWork = workers.find((w) => w.name === targetName);
          if (matchedWork) {
            await supabase.from("WorkerAdvance").insert([
              {
                workerId: matchedWork.id,
                amount: parseFloat(amount),
                status: "مدفوع",
                notes: `سلفة / مصروف موقع ممرر من المشرف: ${statement || type}`,
                date: new Date(date).toISOString(),
              },
            ]);
          }
        }

        showToast(autoApprove ? "تم تسجيل المصروف واعتماده وترحيله بنجاح ✅" : "تم تسجيل المصروف وهو بانتظار اعتماد الأدمن ⏳", "success");
      }

      setTimeout(() => {
        navigate(defaultProjectId ? `/projects/${defaultProjectId}` : "/project-expenses");
      }, 700);
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ بيانات المصروف", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: "60vh" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 14 }}>جاري تحميل بيانات المصروف...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">
            {editId ? "✏️ تعديل مصروف موقع" : "💸 تسجيل مصروف موقع جديد (المشرفون)"}
          </h1>
          <p className="page-subtitle">
            تسجيل مصروفات الموقع المباشرة مع التحديد التلقائي للتاريخ وتوجيه التسميع والترحيل
          </p>
        </div>
        <Link to={defaultProjectId ? `/projects/${defaultProjectId}` : "/project-expenses"} className="btn btn-ghost">
          ← إلغاء والعودة
        </Link>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <form onSubmit={handleSubmit}>
          {/* SECTION 1: THE CORE 3 FIELDS (DATE - EXPENSE - REASON) */}
          <div
            style={{
              background: "hsl(var(--bg-elevated))",
              border: "1px solid hsl(var(--border-subtle))",
              borderRadius: 14,
              padding: "18px 20px",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 900, color: "hsl(var(--gold))", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📌</span>
              <span>البيانات الأساسية للمصروف</span>
            </div>

            <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
              {/* 1. DATE (DEFAULT: TODAY) */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="form-label" style={{ fontWeight: 800, margin: 0 }}>📅 التاريخ *</label>
                  <span className="badge badge-info" style={{ fontSize: 11 }}>تلقائي: اليوم</span>
                </div>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* 2. EXPENSE AMOUNT */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ color: "#ef4444", fontWeight: 900, marginBottom: 6 }}>
                  💸 المصروف (المبلغ بالجنيه) *
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="0.00"
                  required
                  style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {/* 3. REASON / STATEMENT */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 800, marginBottom: 6 }}>
                📝 السبب (سبب وبيان المصروف بالتفصيل) *
              </label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="اكتب سبب وبيان المصروف هنا (مثال: شراء طن أسمنت عيار 500 لمباني عمارة 6، نقل مخلفات، سلفة مقاول...)"
                required
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 2: PROJECT & SUPERVISOR ASSIGNMENT */}
          <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>المشروع المسند إليه *</label>
              <select
                className="form-control"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="" disabled>-- اختر المشروع --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>المشرف القائم بالصرف</label>
              <input
                type="text"
                list="supervisors-list"
                className="form-control"
                placeholder="اختر أو اكتب اسم المشرف..."
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
              />
              <datalist id="supervisors-list">
                {supervisors.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* SECTION 3: EXPENSE ROUTING / TARGET CATEGORY */}
          <div
            style={{
              background: "hsl(var(--bg-card))",
              border: "1px solid hsl(var(--border-subtle))",
              borderRadius: 12,
              padding: "16px 18px",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>
              🔄 توجيه التسميع التلقائي (اختياري)
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">جهة الصرف / التسميع</label>
                <select
                  className="form-control"
                  value={targetCategory}
                  onChange={(e) => {
                    setTargetCategory(e.target.value);
                    setTargetName("");
                  }}
                >
                  <option value="مقاول باطن">لمقاول باطن (ترحيل لحساب المقاول)</option>
                  <option value="عامل موقع">لعامل موقع (ترحيل لحساب العامل / سلفة)</option>
                  <option value="مشرف موقع">لمشرف موقع (عهدة وتصفية حساب)</option>
                  <option value="خامات ومصروف موقع">خامات ونقل ومصروف موقع عام</option>
                </select>
              </div>

              {targetCategory === "مقاول باطن" ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">اختر المقاول الفرعي</label>
                  <input
                    type="text"
                    list="subs-list"
                    className="form-control"
                    placeholder="ابحث أو اختر اسم المقاول..."
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                  />
                  <datalist id="subs-list">
                    {subcontractors.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              ) : targetCategory === "عامل موقع" ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">اختر عامل الموقع</label>
                  <input
                    type="text"
                    list="workers-list"
                    className="form-control"
                    placeholder="ابحث أو اختر اسم العامل..."
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                  />
                  <datalist id="workers-list">
                    {workers.map((w) => (
                      <option key={w.id} value={w.name} />
                    ))}
                  </datalist>
                </div>
              ) : targetCategory === "مشرف موقع" ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">اختر المشرف المستقبل للعهدة</label>
                  <input
                    type="text"
                    list="sups-list"
                    className="form-control"
                    placeholder="اختر اسم المشرف..."
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                  />
                  <datalist id="sups-list">
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">اسم المورد / الجهة المنفذة</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: شركة الأسمنت، سائق النقل..."
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: TYPE & PAYMENT METHOD & NOTES */}
          <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">تصنيف المصروف</label>
              <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="مواد">مواد وخامات</option>
                <option value="عمالة">عمالة ومستحقات</option>
                <option value="نقل">نقل وتشوين</option>
                <option value="إيجار معدات">إيجار معدات وآليات</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">طريقة الدفع</label>
              <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="نقدي">نقدي (من عهدة المشرف)</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="شيك بنكي">شيك بنكي</option>
                <option value="محفظة إلكترونية">محفظة إلكترونية</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ملاحظات إضافية / رقم الفاتورة</label>
            <input
              type="text"
              className="form-control"
              placeholder="رقم الفاتورة أو إيصال الصرف أو ملاحظات موقع..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Auto Approve Option */}
          <div className="form-group" style={{ padding: 14, borderRadius: 10, background: "hsl(var(--bg-elevated))", marginTop: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>✅ اعتماد وترحيل المصروف فورياً لحساب المستحق والمشروع (الترحيل التلقائي)</span>
            </label>
            <span style={{ fontSize: 11, color: "hsl(var(--text-muted))", display: "block", marginTop: 4, marginRight: 28 }}>
              في حالة عدم التحديد، سيرسل المصروف لحالة "⏳ بانتظار الاعتماد" ليتم مراجعته وترحيله من قِبل الأدمن لاحقاً.
            </span>
          </div>

          {/* SUBMIT BUTTONS */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <Link to={defaultProjectId ? `/projects/${defaultProjectId}` : "/project-expenses"} className="btn btn-ghost">
              إلغاء
            </Link>
            <button type="submit" className="btn btn-primary" style={{ padding: "10px 24px" }} disabled={submitting}>
              {submitting ? <span className="spinner" /> : editId ? "💾 حفظ وتعديل المصروف" : "💸 تسجيل المصروف والترحيل"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

