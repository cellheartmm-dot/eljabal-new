import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface WorkerAdvance {
  id: string;
  workerId: string;
  worker?: { id: string; name: string };
  amount: number;
  date: string;
  status: string;
  notes?: string;
}

interface Worker {
  id: string;
  name: string;
}

export default function WorkerAdvancesPage() {
  const [searchParams] = useSearchParams();
  const filterWorkerId = searchParams.get("workerId") || "";

  const { toasts, showToast, removeToast } = useToast();
  const [advances, setAdvances] = useState<WorkerAdvance[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [workerFilter, setWorkerFilter] = useState(filterWorkerId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aRes, wRes] = await Promise.all([
        supabase.from("WorkerAdvance").select("*, worker:Worker(id, name)").order("date", { ascending: false }),
        supabase.from("Worker").select("id, name").order("name", { ascending: true }),
      ]);

      if (aRes.error) throw aRes.error;
      if (wRes.error) throw wRes.error;

      setAdvances(aRes.data || []);
      setWorkers(wRes.data || []);
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل سلف العمال من Supabase", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string, amountText: string) => {
    if (!confirm(`هل أنت متأكد من حذف هذه السلفة بقيمة (${amountText})؟`)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("WorkerAdvance").delete().eq("id", id);
      if (error) throw error;
      showToast("تم حذف السلفة بنجاح ✅", "success");
      fetchData();
    } catch (e: any) {
      showToast(e.message || "فشل في حذف السلفة", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = advances.filter((a) => {
    const s = searchTerm.toLowerCase();
    const wName = a.worker?.name || "";
    const notes = a.notes || "";

    const matchSearch = wName.toLowerCase().includes(s) || notes.toLowerCase().includes(s);
    const matchWorker = !workerFilter || a.workerId === workerFilter;

    return matchSearch && matchWorker;
  });

  const totalAdvancesAmount = filtered.reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">💵 سلف العمال المقيدة بالنظام</h1>
          <p className="page-subtitle">متابعة وتسجيل السلف والمبالغ النقدية المصروفة للعمال</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/worker-advances/create" className="btn btn-primary">
            + إضافة سلفة جديدة
          </Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>عدد السلف المسجلة: </span>
            <strong style={{ fontSize: 16 }}>{filtered.length} سلفة</strong>
          </div>
          <div>
            <span style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>إجمالي المبالغ المصروفة كسلف: </span>
            <strong style={{ fontSize: 18, color: "#ef4444" }}>{formatCurrency(totalAdvancesAmount)}</strong>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 بحث باسم العامل أو ملاحظات السلفة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select className="form-control" value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}>
            <option value="">-- جميع العمال --</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل السلف...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💵</div>
              <div className="empty-state-text">
                {searchTerm || workerFilter ? "لا توجد سلف تطابق فلاتر البحث" : "لم يتم تسجيل أي سلف للعمال بعد"}
              </div>
              <Link to="/worker-advances/create" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                + تسجيل أول سلفة
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>اسم العامل</th>
                  <th>نوع المستقطع</th>
                  <th>قيمة المعاملة</th>
                  <th>سبب الخصم والبيان</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => {
                  const isDeduction = a.notes?.includes("خصم") || a.notes?.includes("جزاء") || a.notes?.includes("إتلاف") || a.notes?.includes("إيجار");
                  return (
                    <tr key={a.id}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                      <td>{formatDateShort(a.date)}</td>
                      <td style={{ fontWeight: 800 }}>{a.worker?.name || "عامل"}</td>
                      <td>
                        <span className={`badge ${isDeduction ? "badge-danger" : "badge-warning"}`}>
                          {isDeduction ? "🛑 خصم / استقطاع" : "💵 سلفة تحت الحساب"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(a.amount)}</td>
                      <td style={{ fontWeight: 600 }}>{a.notes || "سلفة نقدية"}</td>
                      <td className="print:hidden" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <Link to={`/worker-advances/create?edit=${a.id}`} className="btn-icon-centered" title="تعديل">
                            ✏️
                          </Link>
                          <button
                            onClick={() => handleDelete(a.id, formatCurrency(a.amount))}
                            disabled={deletingId === a.id}
                            className="btn-icon-centered text-danger"
                            title="حذف"
                          >
                            {deletingId === a.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "🗑️"}
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
    </div>
  );
}
