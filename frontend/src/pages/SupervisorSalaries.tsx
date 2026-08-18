import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface SupervisorSalary {
  id: string;
  supervisorId: string;
  supervisor?: { id: string; name: string };
  month: string;
  amount: number;
  status: string;
  paidAt?: string;
  notes?: string;
}

interface Supervisor {
  id: string;
  name: string;
  salary: number;
}

export default function SupervisorSalariesPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [salaries, setSalaries] = useState<SupervisorSalary[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [supervisorId, setSupervisorId] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("مدفوع");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, supRes] = await Promise.all([
        supabase.from("SupervisorSalary").select("*, supervisor:Supervisor(id, name)").order("createdAt", { ascending: false }),
        supabase.from("Supervisor").select("id, name, salary").order("name", { ascending: true }),
      ]);

      if (sRes.error) throw sRes.error;
      if (supRes.error) throw supRes.error;

      setSalaries(sRes.data || []);
      setSupervisors(supRes.data || []);
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل سجل الرواتب من Supabase", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSupervisorChange = (id: string) => {
    setSupervisorId(id);
    const found = supervisors.find((s) => s.id === id);
    if (found) {
      setAmount(found.salary?.toString() || "");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorId || !amount) {
      showToast("برجاء اختيار المشرف وإدخال قيمة الراتب", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("SupervisorSalary").insert([
        {
          supervisorId,
          month,
          amount: parseFloat(amount) || 0,
          status,
          paidAt: new Date().toISOString(),
          notes,
        },
      ]);

      if (error) throw error;
      showToast("تم تسجيل صرف الراتب بنجاح ✅", "success");
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "فشل في تسجيل الراتب", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      const { error } = await supabase.from("SupervisorSalary").delete().eq("id", id);
      if (error) throw error;
      showToast("تم الحذف بنجاح ✅", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const totalSalariesPaid = salaries.reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🏦 مسيرات رواتب المشرفين والمهندسين</h1>
          <p className="page-subtitle">متابعة وصرف المستحقات الشهرية لطاقم الإشراف بالمواقع والشركة</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + تسديد / صرف راتب مشرف
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة المسير
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>إجمالي الرواتب المسددة: </span>
            <strong style={{ fontSize: 18, color: "#10b981" }}>{formatCurrency(totalSalariesPaid)}</strong>
          </div>
          <div>
            <span style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>إجمالي السجلات: </span>
            <strong>{salaries.length} مسير</strong>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل الرواتب...</div>
            </div>
          ) : salaries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏦</div>
              <div className="empty-state-text">لم يتم تسجيل أي رواتب للمشرفين بعد</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
                + صرف أول راتب
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>المشرف / المهندس</th>
                  <th>الشهر</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>تاريخ الصرف</th>
                  <th>ملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700 }}>{s.supervisor?.name || "مشرف"}</td>
                    <td><span className="badge badge-primary">{s.month}</span></td>
                    <td style={{ fontWeight: 800, color: "#10b981" }}>{formatCurrency(s.amount)}</td>
                    <td><span className="badge badge-success">{s.status || "مدفوع"}</span></td>
                    <td>{s.paidAt ? formatDateShort(s.paidAt) : "-"}</td>
                    <td>{s.notes || "-"}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <button onClick={() => handleDelete(s.id)} className="btn-icon-centered text-danger" title="حذف">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">🏦 صرف راتب مشرف / مهندس</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">المشرف *</label>
                  <select className="form-control" required value={supervisorId} onChange={(e) => handleSupervisorChange(e.target.value)}>
                    <option value="" disabled>-- اختر المشرف --</option>
                    {supervisors.map((sup) => (
                      <option key={sup.id} value={sup.id}>{sup.name} ({sup.salary} ج.م)</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">الشهر المستحق *</label>
                    <input type="month" className="form-control" required value={month} onChange={(e) => setMonth(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المبلغ (جنيه) *</label>
                    <input type="number" step="0.01" className="form-control" required value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">حالة الصرف</label>
                  <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="مدفوع">مدفوع بالكامل</option>
                    <option value="معلق">معلق / جزئي</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input type="text" className="form-control" placeholder="ملاحظات الصرف..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ وصرف الراتب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
