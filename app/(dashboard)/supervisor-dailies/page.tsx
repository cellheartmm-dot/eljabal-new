"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export default function SupervisorDailiesPage() {
  const { showToast } = useToast();
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [dailies, setDailies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [supervisorId, setSupervisorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("حاضر");
  const [notes, setNotes] = useState("");

  // Filters
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterSupervisor, setFilterSupervisor] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [supRes, projRes, dailyRes] = await Promise.all([
        fetch("/api/supervisors").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
        fetch(`/api/supervisor-dailies?month=${filterMonth}&year=${filterYear}`).then((r) => r.json()),
      ]);

      if (Array.isArray(supRes)) {
        setSupervisors(supRes);
        if (!supervisorId && supRes.length > 0) setSupervisorId(supRes[0].id);
      }
      const pList = Array.isArray(projRes) ? projRes : projRes?.projects || [];
      setProjects(pList);
      if (!projectId && pList.length > 0) setProjectId(pList[0].id);

      if (Array.isArray(dailyRes)) {
        setDailies(dailyRes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterMonth, filterYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorId) return;

    const targetSup = supervisors.find((s) => s.id === supervisorId);
    const targetProj = projects.find((p) => p.id === projectId);

    setSubmitting(true);
    try {
      const res = await fetch("/api/supervisor-dailies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorId,
          supervisorName: targetSup ? targetSup.name : "",
          projectId: projectId || null,
          projectName: targetProj ? targetProj.name : "إشراف عام",
          date,
          status,
          notes,
        }),
      });

      if (res.ok) {
        showToast(`تم تسجيل حضور المشرف (${targetSup?.name}) بنجاح 🎉`, "success");
        setNotes("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت تأكد من حذف سجل الحضور هذا؟")) return;
    try {
      await fetch(`/api/supervisor-dailies?id=${id}`, { method: "DELETE" });
      showToast("تم حذف سجل الحضور بنجاح", "info");
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredDailies = dailies.filter((d) => !filterSupervisor || d.supervisorId === filterSupervisor);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">🗓️ تسجيل وتوزيع حضور المشرفين بالمواقع</h1>
          <p className="page-subtitle">تسجيل أيام عمل المشرفين لكل مشروع لتوزيع تكلفة الرواتب التلقائي بنهاية الشهر</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/supervisor-salaries" className="btn btn-gold">
            💰 رواتب وتوزيع المشرفين
          </Link>
          <Link href="/supervisors" className="btn btn-ghost">
            ← قائمة المشرفين
          </Link>
        </div>
      </div>

      <div className="grid-3" style={{ gap: 20 }}>
        {/* Record Form */}
        <div className="card" style={{ gridColumn: "span 1" }}>
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: 16 }}>✍️ تسجيل يومية/حضور جديد</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">المشرف *</label>
                <select
                  className="form-control"
                  required
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                >
                  <option value="" disabled>-- اختر المشرف --</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المشروع / الموقع *</label>
                <select
                  className="form-control"
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="" disabled>-- اختر المشروع --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">التاريخ *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">حالة الحضور</label>
                <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="حاضر">حاضر (يوم كامل - 1.0)</option>
                  <option value="نصف يوم">نصف يوم (0.5)</option>
                  <option value="إجازة">إجازة (0.0)</option>
                  <option value="غائب">غائب (0.0)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات العمل بالموقع</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ملاحظات تفصيلية حول ما قاد به..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: "100%", marginTop: 10 }}>
                {submitting ? <span className="spinner" /> : "+ تسجيل الحضور بالموقع"}
              </button>
            </form>
          </div>
        </div>

        {/* Dailies Table & Monthly Summary */}
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <h2 className="card-title" style={{ fontSize: 16 }}>📋 سجلات حضور المشرفين خلال الشهر</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <select className="form-control" style={{ padding: "4px 8px", fontSize: 12 }} value={filterSupervisor} onChange={(e) => setFilterSupervisor(e.target.value)}>
                <option value="">جميع المشرفين</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select className="form-control" style={{ padding: "4px 8px", fontSize: 12 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m)}>شهر {m}</option>
                ))}
              </select>

              <select className="form-control" style={{ padding: "4px 8px", fontSize: 12 }} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </div>

          <div className="card-body">
            <div className="table-container">
              {loading ? (
                <div className="empty-state">
                  <span className="spinner" />
                  <div className="empty-state-text">جاري تحميل سجلات حضور المشرفين...</div>
                </div>
              ) : filteredDailies.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="empty-state-icon">🗓️</div>
                  <div className="empty-state-text">لا توجد سجلات حضور مسجلة للمشرفين في هذا الشهر</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 35, textAlign: "center" }}>#</th>
                      <th>تاريخ اليوم</th>
                      <th>اسم المشرف</th>
                      <th>المشروع / الموقع</th>
                      <th style={{ textAlign: "center" }}>الحالة</th>
                      <th>الملاحظات</th>
                      <th style={{ width: 50, textAlign: "center" }}>إزالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDailies.map((row, idx) => (
                      <tr key={row.id}>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 700 }}>{row.date}</td>
                        <td style={{ fontWeight: 800, color: "hsl(var(--gold))" }}>👔 {row.supervisorName}</td>
                        <td style={{ fontWeight: 700 }}>🏗️ {row.projectName}</td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`badge ${row.status === "حاضر" ? "badge-success" : row.status === "نصف يوم" ? "badge-warning" : "badge-danger"}`}>
                            {row.status} ({row.daysCount} يوم)
                          </span>
                        </td>
                        <td>{row.notes || "-"}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-sm"
                            style={{ padding: "2px 6px", background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                            onClick={() => handleDelete(row.id)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
