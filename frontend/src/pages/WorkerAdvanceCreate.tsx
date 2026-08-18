import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Worker {
  id: string;
  name: string;
}

export default function WorkerAdvanceCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const editId = searchParams.get("edit");
  const defaultWorkerId = searchParams.get("workerId") || "";

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [workerId, setWorkerId] = useState(defaultWorkerId);
  const [advanceType, setAdvanceType] = useState("سلفة تحت الحساب");
  const [amount, setAmount] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [status, setStatus] = useState("مدفوع");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from("Worker")
          .select("id, name")
          .order("name", { ascending: true });
        if (error) throw error;
        setWorkers(data || []);
      } catch (err: any) {
        showToast(err.message, "error");
      }

      if (editId) {
        setLoading(true);
        try {
          const { data: a, error } = await supabase
            .from("WorkerAdvance")
            .select("*")
            .eq("id", editId)
            .single();

          if (error) throw error;
          if (a) {
            setDate(a.date ? new Date(a.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
            setWorkerId(a.workerId || "");
            setAmount(a.amount?.toString() || "");
            setStatus(a.status || "مدفوع");
            setNotes(a.notes || "");
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
    if (!workerId || !amount) {
      showToast("برجاء اختيار العامل وإدخال المبلغ المقبوض/المخصوم", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const reasonText = deductionReason ? ` [سبب الخصم: ${deductionReason}]` : "";
      const notesStr = `${advanceType}${reasonText}${notes ? " - " + notes : ""}`;

      const payload = {
        workerId,
        date: new Date(date).toISOString(),
        amount: parseFloat(amount) || 0,
        status,
        notes: notesStr,
      };

      if (editId) {
        const { error } = await supabase.from("WorkerAdvance").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("تم تحديث السلفة / الخصم بنجاح ✅", "success");
      } else {
        const { error } = await supabase.from("WorkerAdvance").insert([payload]);
        if (error) throw error;
        showToast("تم إضافة السلفة / الخصم المالي بنجاح ✅", "success");
      }

      setTimeout(() => {
        navigate("/worker-advances");
      }, 500);
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ البيانات", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">{editId ? "✏️ تعديل سلفة / خصم عامل" : "💵 تسجيل سلفة أو خصم مالي للعامل"}</h1>
          <p className="page-subtitle">تسجيل المبالغ المصروفة كسلف أو مخصومة كجزاءات وتخصم من مستحقات العامل</p>
        </div>
        <Link to="/worker-advances" className="btn btn-ghost">
          ← إلغاء والعودة
        </Link>
      </div>

      <div className="card" style={{ maxWidth: 650, margin: "0 auto", padding: 24 }}>
        {loading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 30, height: 30 }} />
            <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل البيانات...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">نوع العملية والاستقطاع *</label>
                <select className="form-control" value={advanceType} onChange={(e) => setAdvanceType(e.target.value)}>
                  <option value="سلفة تحت الحساب">💵 سلفة نقدية تحت الحساب</option>
                  <option value="خصم / جزاء مالي">🛑 خصم / جزاء مالي على العامل</option>
                  <option value="إيجار ومرافق مخصومة">🏠 إيجار ومرافق مخصومة (سكن/مياه/كهرباء)</option>
                  <option value="إتلاف وتلفيات خامات">⚠️ إتلاف وتلفيات خامات بالموقع</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">العامل المستهدف *</label>
                <select className="form-control" required value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
                  <option value="" disabled>-- اختر العامل --</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">التاريخ *</label>
                <input type="date" className="form-control" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#ef4444", fontWeight: 800 }}>
                  المبلغ المخصوم / المسدد (جنيه) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">سبب الخصم والجزاء (إن وجد)</label>
              <input
                type="text"
                className="form-control"
                placeholder="مثال: تأخير عن العمل، جزاء يوم غياب بدون إذن، إتلاف عُدة..."
                value={deductionReason}
                onChange={(e) => setDeductionReason(e.target.value)}
              />
            </div>

            <div className="grid-2" style={{ gap: 16, marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">حالة المعاملة</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="مدفوع">مدفوع / مخصوم آلياً</option>
                  <option value="معلق">معلق للتسوية</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات وبيان إضافي</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="أي ملاحظات إضافية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <Link to="/worker-advances" className="btn btn-ghost">
                إلغاء
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : editId ? "تحديث المعاملة" : "حفظ وحسم المبلغ"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
