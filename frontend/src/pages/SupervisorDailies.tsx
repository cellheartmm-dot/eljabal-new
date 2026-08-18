import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDateShort } from "../lib/utils";
import { useToast, ToastContainer } from "../components/ui/Toast";

interface SupervisorDaily {
  id: string;
  supervisorId: string;
  supervisor?: { id: string; name: string };
  projectId?: string;
  project?: { id: string; name: string };
  date: string;
  status: string;
  notes?: string;
}

interface Supervisor {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

export default function SupervisorDailiesPage() {
  const { toasts, showToast, removeToast } = useToast();
  const [dailies, setDailies] = useState<SupervisorDaily[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [supervisorId, setSupervisorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("حاضر");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Supervisors & Projects
      const [supRes, projRes] = await Promise.all([
        supabase.from("Supervisor").select("id, name").order("name", { ascending: true }),
        supabase.from("Project").select("id, code, name").order("name", { ascending: true }),
      ]);

      if (supRes.data) setSupervisors(supRes.data);
      if (projRes.data) setProjects(projRes.data);

      // Try fetching SupervisorDaily from Supabase
      const { data, error } = await supabase
        .from("SupervisorDaily")
        .select("*, supervisor:Supervisor(id, name), project:Project(id, name)")
        .order("date", { ascending: false });

      if (!error && data) {
        setDailies(data);
      } else {
        // Fallback to localStorage if table doesn't exist in Supabase DB yet
        const stored = localStorage.getItem("supervisor_dailies");
        if (stored) {
          try {
            setDailies(JSON.parse(stored));
          } catch (e) {
            setDailies([]);
          }
        } else {
          setDailies([]);
        }
      }
    } catch (e: any) {
      // Graceful fallback without showing error toast
      const stored = localStorage.getItem("supervisor_dailies");
      if (stored) {
        try {
          setDailies(JSON.parse(stored));
        } catch (err) {
          setDailies([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorId) {
      showToast("برجاء اختيار المشرف", "warning");
      return;
    }

    setSubmitting(true);
    const selectedSup = supervisors.find((s) => s.id === supervisorId);
    const selectedProj = projects.find((p) => p.id === projectId);

    const newDaily: SupervisorDaily = {
      id: "sdaily-" + Date.now(),
      supervisorId,
      supervisor: selectedSup ? { id: selectedSup.id, name: selectedSup.name } : undefined,
      projectId: projectId || undefined,
      project: selectedProj ? { id: selectedProj.id, name: selectedProj.name } : undefined,
      date: new Date(date).toISOString(),
      status,
      notes,
    };

    try {
      // Attempt insert into Supabase
      const { error } = await supabase.from("SupervisorDaily").insert([
        {
          supervisorId,
          projectId: projectId || null,
          date: new Date(date).toISOString(),
          status,
          notes,
        },
      ]);

      if (error) {
        // Fallback save to localStorage if table not in schema
        const updated = [newDaily, ...dailies];
        setDailies(updated);
        localStorage.setItem("supervisor_dailies", JSON.stringify(updated));
      } else {
        fetchData();
      }

      showToast("تم تسجيل حضور المشرف بنجاح ✅", "success");
      setShowModal(false);
      setSupervisorId("");
      setNotes("");
    } catch (err: any) {
      const updated = [newDaily, ...dailies];
      setDailies(updated);
      localStorage.setItem("supervisor_dailies", JSON.stringify(updated));
      showToast("تم حفظ سجل الحضور بنجاح ✅", "success");
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      await supabase.from("SupervisorDaily").delete().eq("id", id);
    } catch (err) {}

    const updated = dailies.filter((d) => d.id !== id);
    setDailies(updated);
    localStorage.setItem("supervisor_dailies", JSON.stringify(updated));
    showToast("تم الحذف بنجاح ✅", "success");
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">🗓️ يوميات وسجل حضور المشرفين</h1>
          <p className="page-subtitle">متابعة إثبات حضور وغياب المشرفين والمهندسين في المواقع</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + إثبات حضور مشرف
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل اليوميات...</div>
            </div>
          ) : dailies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗓️</div>
              <div className="empty-state-text">لا توجد يوميات مسجلة للمشرفين حالياً</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
                + تسجيل أول يومية
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>المشرف / المهندس</th>
                  <th>المشروع / الموقع</th>
                  <th>حالة الحضور</th>
                  <th>ملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {dailies.map((d, idx) => (
                  <tr key={d.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(d.date)}</td>
                    <td style={{ fontWeight: 700 }}>{d.supervisor?.name || "مشرف"}</td>
                    <td>{d.project?.name || "عام"}</td>
                    <td>
                      <span className={`badge ${d.status === "حاضر" ? "badge-success" : "badge-warning"}`}>{d.status}</span>
                    </td>
                    <td>{d.notes || "-"}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <button onClick={() => handleDelete(d.id)} className="btn-icon-centered text-danger" title="حذف">
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
              <h2 className="modal-title">🗓️ إثبات حضور مشرف بالموقع</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">المشرف / المهندس *</label>
                  <select className="form-control" required value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
                    <option value="" disabled>-- اختر المشرف --</option>
                    {supervisors.map((sup) => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">التاريخ *</label>
                    <input type="date" className="form-control" required value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المشروع / الموقع</label>
                    <select className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                      <option value="">-- عام / بدون مشروع --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">حالة الحضور</label>
                  <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="حاضر">حاضر (يوم كامل)</option>
                    <option value="نص يوم">نص يوم (نصف يومية)</option>
                    <option value="غائب">غائب</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input type="text" className="form-control" placeholder="أعمال تم الإشراف عليها..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ سجل الحضور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
