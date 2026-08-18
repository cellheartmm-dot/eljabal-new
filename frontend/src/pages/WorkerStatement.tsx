import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

export default function WorkerStatementPage() {
  const { id } = useParams<{ id: string }>();
  const { toasts, showToast, removeToast } = useToast();

  const [worker, setWorker] = useState<any>(null);
  const [dailies, setDailies] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      supabase.from("Worker").select("*").eq("id", id).single(),
      supabase.from("WorkerDaily").select("*, project:Project(id, name)").eq("workerId", id).order("date", { ascending: false }),
      supabase.from("WorkerAdvance").select("*").eq("workerId", id).order("date", { ascending: false }),
    ])
      .then(([wRes, dRes, aRes]) => {
        if (wRes.error) throw wRes.error;
        setWorker(wRes.data || null);
        setDailies(dRes.data || []);
        setAdvances(aRes.data || []);
      })
      .catch((err) => showToast(err.message || "فشل في تحميل كشف الحساب من Supabase", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: "50vh" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 14 }}>جاري تجميع كشف حساب العامل...</div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="empty-state" style={{ minHeight: "50vh" }}>
        <div className="empty-state-icon">👷</div>
        <div className="empty-state-text">لم يتم العثور على هذا العامل</div>
        <Link to="/workers" className="btn btn-primary" style={{ marginTop: 12 }}>
          ← العودة لقائمة العمال
        </Link>
      </div>
    );
  }

  const totalDailyEarned = dailies.reduce((sum, d) => sum + (d.amount || 0), 0);
  const totalAdvances = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
  const netDue = totalDailyEarned - totalAdvances;

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">📄 كشف حساب العامل: {worker.name}</h1>
          <p className="page-subtitle">
            المهنة: {worker.specialty || "عام"} • اليومية: {formatCurrency(worker.dailyRate)} • الهاتف: {worker.phone || "-"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة كشف الحساب
          </button>
          <Link to="/workers" className="btn btn-ghost">
            ← العودة للعمال
          </Link>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid-3" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>إجمالي استحقاق اليوميات:</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalDailyEarned)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>عدد أيام الحضور: {dailies.length} يوم</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)", color: "#fff", borderRadius: 16, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>إجمالي السلف المستلمة:</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalAdvances)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>عدد السلف: {advances.length}</div>
        </div>

        <div
          style={{
            background: netDue >= 0 ? "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)" : "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
            color: "#fff",
            borderRadius: 16,
            padding: "18px 20px",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.9 }}>الصافي المستحق للعامل:</div>
          <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{formatCurrency(netDue)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{netDue >= 0 ? "مستحق للعامل تسليمه" : "مستحق على العامل للشركة"}</div>
        </div>
      </div>

      {/* Dailies Table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ padding: "16px 20px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>📅 سجل حضور ويوميات الموقع ({dailies.length})</h3>
        </div>
        <div className="table-container">
          {dailies.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <div className="empty-state-text">لا توجد يوميات مسجلة لهذا العامل بعد</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>التاريخ</th>
                  <th>المشروع / الموقع</th>
                  <th>الحالة</th>
                  <th>قيمة اليومية</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {dailies.map((d, idx) => (
                  <tr key={d.id}>
                    <td>{idx + 1}</td>
                    <td>{formatDateShort(d.date)}</td>
                    <td style={{ fontWeight: 700 }}>{d.project?.name || "عام"}</td>
                    <td>
                      <span className={`badge ${d.status === "حاضر" ? "badge-success" : d.status === "نص يوم" ? "badge-warning" : "badge-danger"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: "#10b981" }}>{formatCurrency(d.amount)}</td>
                    <td>{d.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Advances Table */}
      <div className="card">
        <div className="card-header" style={{ padding: "16px 20px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>💵 سجل السلف والمبالغ المستلمة ({advances.length})</h3>
        </div>
        <div className="table-container">
          {advances.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <div className="empty-state-text">لا توجد سلف مسجلة لهذا العامل بعد</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>التاريخ</th>
                  <th>مبلغ السلفة</th>
                  <th>الحالة</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((a, idx) => (
                  <tr key={a.id}>
                    <td>{idx + 1}</td>
                    <td>{formatDateShort(a.date)}</td>
                    <td style={{ fontWeight: 800, color: "#ef4444" }}>{formatCurrency(a.amount)}</td>
                    <td><span className="badge badge-info">{a.status || "مدفوع"}</span></td>
                    <td>{a.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
