import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";

export default function RevenueCreatePage() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [projectId, setProjectId] = useState("");
  const [source, setSource] = useState("الشركة المالكة للمشروع");
  const [type, setType] = useState("مستخلص نسبة % من العقد");
  const [paymentMethod, setPaymentMethod] = useState("تحويل بنكي");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    supabase
      .from("Project")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setProjects(data);
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showToast("يرجى إدخال مبلغ الإيراد بشكل صحيح", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        projectId: projectId || null,
        source: source.trim(),
        type,
        paymentMethod,
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        description: description.trim(),
        notes: notes.trim(),
      };

      const { error } = await supabase.from("Revenue").insert([payload]);
      if (error) throw error;

      showToast("تم تسجيل الإيراد بنجاح 💰✅", "success");
      setTimeout(() => navigate("/revenues"), 1000);
    } catch (err: any) {
      showToast(err.message || "حدث خطأ أثناء حفظ الإيراد", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">💰 تسجيل دفعة إيراد / تحصيل</h1>
          <p className="page-subtitle">إثبات المبالغ المستلمة من الشركات المالكة أو الشركاء</p>
        </div>
        <Link to="/revenues" className="btn btn-ghost">
          ← العودة للإيرادات
        </Link>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit}>
            <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المشروع التابع له الإيراد</label>
                <select className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">-- إيراد عام (غير تابع لمشروع محدد) --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">مصدر الإيراد / الجهة المحولة *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="مثال: الشركة المالكة، مستثمر، شيك عميل..."
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-3" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">نوع التحصيل *</label>
                <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="مستخلص نسبة % من العقد">مستخلص نسبة % من العقد</option>
                  <option value="دفعة مقدمة">دفعة مقدمة</option>
                  <option value="مبلغ مقطوعية">مبلغ مقطوعية</option>
                  <option value="إيداع رأس مال شريك">إيداع رأس مال شريك</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">طريقة الاستلام *</label>
                <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="شيك مصرفي">شيك مصرفي</option>
                  <option value="نقدي (كاش)">نقدي (كاش)</option>
                  <option value="فودافون كاش / محفظة">فودافون كاش / محفظة</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">المبلغ المستلم (جنيه) *</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ fontWeight: 800, color: "#10b981" }}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">تاريخ الاستلام *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">البيان / الشرح</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="بيان دفعة تحصيل..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">ملاحظات إضافية</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="أية ملاحظات أخرى..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center" style={{ borderTop: "1px solid hsl(var(--border-subtle))", paddingTop: 16 }}>
              <Link to="/revenues" className="btn btn-ghost">إلغاء</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : "حفظ وتأكيد الإيراد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
