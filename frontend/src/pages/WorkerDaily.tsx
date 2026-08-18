import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface WorkerDaily {
  id: string;
  workerId: string;
  worker?: { id: string; name: string; dailyRate: number };
  projectId?: string;
  project?: { id: string; name: string; code: string };
  date: string;
  status: string;
  amount: number;
  notes?: string;
}

interface Worker {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

export default function WorkerDailyPage() {
  const [searchParams] = useSearchParams();
  const filterWorkerId = searchParams.get("workerId") || "";

  const { toasts, showToast, removeToast } = useToast();
  const [dailies, setDailies] = useState<WorkerDaily[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [workerFilter, setWorkerFilter] = useState(filterWorkerId);
  const [projectFilter, setProjectFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dRes, wRes, pRes] = await Promise.all([
        supabase.from("WorkerDaily").select("*, worker:Worker(id, name, dailyRate), project:Project(id, name, code)").order("date", { ascending: false }),
        supabase.from("Worker").select("id, name").order("name", { ascending: true }),
        supabase.from("Project").select("id, code, name").order("name", { ascending: true }),
      ]);

      if (dRes.error) throw dRes.error;
      if (wRes.error) throw wRes.error;
      if (pRes.error) throw pRes.error;

      setDailies(dRes.data || []);
      setWorkers(wRes.data || []);
      setProjects(pRes.data || []);
    } catch (e: any) {
      showToast(e.message || "فشل في تحميل يوميات العمال من Supabase", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("WorkerDaily").delete().eq("id", id);
      if (error) throw error;
      showToast("تم حذف يومية العامل بنجاح ✅", "success");
      fetchData();
    } catch (e: any) {
      showToast(e.message || "فشل في حذف اليومية", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = dailies.filter((d) => {
    const s = searchTerm.toLowerCase();
    const wName = d.worker?.name || "";
    const pName = d.project?.name || "";
    const notes = d.notes || "";

    const matchSearch = wName.toLowerCase().includes(s) || pName.toLowerCase().includes(s) || notes.toLowerCase().includes(s);
    const matchWorker = !workerFilter || d.workerId === workerFilter;
    const matchProj = !projectFilter || d.projectId === projectFilter;

    return matchSearch && matchWorker && matchProj;
  });

  const totalAmount = filtered.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📅 يوميات العمال بالموقع</h1>
          <p className="page-subtitle">تسجيل ومتابعة حضور وعمالة المواقع وحساب الاستحقاق اليومي</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/worker-daily/create" className="btn btn-primary">
            + إضافة يومية جديدة
          </Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>

      {/* Summary Stat Bar */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>عدد اليوميات المسجلة: </span>
            <strong style={{ fontSize: 16 }}>{filtered.length} سجل</strong>
          </div>
          <div>
            <span style={{ fontSize: 13, color: "hsl(var(--text-muted))" }}>إجمالي استحقاق اليوميات: </span>
            <strong style={{ fontSize: 18, color: "#10b981" }}>{formatCurrency(totalAmount)}</strong>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 بحث باسم العامل، الموقع، أو الملاحظات..."
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
          <select className="form-control" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">-- جميع المشاريع --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل اليوميات...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-text">
                {searchTerm || workerFilter || projectFilter ? "لا توجد يوميات تطابق فلاتر البحث" : "لم يتم تسجيل أي يوميات بعد"}
              </div>
              <Link to="/worker-daily/create" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                + تسجيل أول يومية
              </Link>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>اسم العامل</th>
                  <th>المشروع / الموقع</th>
                  <th>حالة الحضور</th>
                  <th>المبلغ المستحق</th>
                  <th>ملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, idx) => (
                  <tr key={d.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(d.date)}</td>
                    <td style={{ fontWeight: 700 }}>{d.worker?.name || "عامل"}</td>
                    <td>{d.project?.name || "عام / ورشة"}</td>
                    <td>
                      <span className={`badge ${d.status === "حاضر" ? "badge-success" : d.status === "نص يوم" ? "badge-warning" : "badge-danger"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800, color: "#10b981" }}>{formatCurrency(d.amount)}</td>
                    <td>{d.notes || "-"}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <Link to={`/worker-daily/create?edit=${d.id}`} className="btn-icon-centered" title="تعديل">
                          ✏️
                        </Link>
                        <button
                          onClick={() => handleDelete(d.id)}
                          disabled={deletingId === d.id}
                          className="btn-icon-centered text-danger"
                          title="حذف"
                        >
                          {deletingId === d.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "🗑️"}
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
    </div>
  );
}
