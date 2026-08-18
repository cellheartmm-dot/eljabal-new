import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface Worker {
  id: string;
  name: string;
  dailyRate: number;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

export default function WorkerDailyCreatePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const editId = searchParams.get("edit");
  const defaultWorkerId = searchParams.get("workerId") || "";
  const defaultProjectId = searchParams.get("projectId") || "";

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [workerId, setWorkerId] = useState(defaultWorkerId);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [status, setStatus] = useState("حاضر");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [wRes, pRes] = await Promise.all([
          supabase.from("Worker").select("id, name, dailyRate").order("name", { ascending: true }),
          supabase.from("Project").select("id, code, name").order("name", { ascending: true }),
        ]);

        if (wRes.error) throw wRes.error;
        if (pRes.error) throw pRes.error;
        setWorkers(wRes.data || []);
        setProjects(pRes.data || []);
      } catch (err: any) {
        showToast(err.message, "error");
      }

      if (editId) {
        setLoading(true);
        try {
          const { data: d, error } = await supabase
            .from("WorkerDaily")
            .select("*")
            .eq("id", editId)
            .single();

          if (error) throw error;
          if (d) {
            setDate(d.date ? new Date(d.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
            setWorkerId(d.workerId || "");
            setProjectId(d.projectId || "");
            setStatus(d.status || "حاضر");
            setAmount(d.amount?.toString() || "");
            setNotes(d.notes || "");
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

  const handleWorkerChange = (selectedId: string) => {
    setWorkerId(selectedId);
    const selectedWorker = workers.find((w) => w.id === selectedId);
    if (selectedWorker) {
      calculateAmount(status, selectedWorker.dailyRate);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    const selectedWorker = workers.find((w) => w.id === workerId);
    if (selectedWorker) {
      calculateAmount(newStatus, selectedWorker.dailyRate);
    }
  };

  const calculateAmount = (st: string, rate: number) => {
    if (st === "حاضر") setAmount(rate.toString());
    else if (st === "نص يوم") setAmount((rate / 2).toString());
    else if (st === "غائب") setAmount("0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) {
      showToast("برجاء اختيار العامل", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        workerId,
        projectId: projectId || null,
        date: new Date(date).toISOString(),
        status,
        amount: parseFloat(amount) || 0,
        notes,
      };

      if (editId) {
        const { error } = await supabase.from("WorkerDaily").update(payload).eq("id", editId);
        if (error) throw error;
        showToast("تم تحديث اليومية بنجاح ✅", "success");
      } else {
        const { error } = await supabase.from("WorkerDaily").insert([payload]);
        if (error) throw error;
        showToast("تم إدخال اليومية بنجاح ✅", "success");
      }

      setTimeout(() => {
        navigate("/worker-daily");
      }, 500);
    } catch (err: any) {
      showToast(err.message || "فشل في حفظ اليومية", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header">
        <div>
          <h1 className="page-title">{editId ? "✏️ تعديل يومية عامل" : "📅 تسجيل يومية جديد بالشركة / الموقع"}</h1>
          <p className="page-subtitle">إثبات حضور العامل بالموقع وحساب المستحقات اليومية</p>
        </div>
        <Link to="/worker-daily" className="btn btn-ghost">
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
                <label className="form-label">العامل *</label>
                <select className="form-control" required value={workerId} onChange={(e) => handleWorkerChange(e.target.value)}>
                  <option value="" disabled>
                    -- اختر العامل --
                  </option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (اليومية: {w.dailyRate} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المشروع / الموقع (اختياري)</label>
                <select className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">-- ورشة عامة / بدون مشروع --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">التاريخ *</label>
                <input type="date" className="form-control" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">حالة الحضور *</label>
                <select className="form-control" required value={status} onChange={(e) => handleStatusChange(e.target.value)}>
                  <option value="حاضر">حاضر (يوم كامل)</option>
                  <option value="نص يوم">نص يوم (نصف يومية)</option>
                  <option value="غائب">غائب</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">المبلغ المستحق (جنيه) *</label>
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

            <div className="form-group">
              <label className="form-label">ملاحظات</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="أعمال تم تنفيذها أو ملاحظات الحضور..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <Link to="/worker-daily" className="btn btn-ghost">
                إلغاء
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <span className="spinner" /> : editId ? "تحديث اليومية" : "حفظ اليومية"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
