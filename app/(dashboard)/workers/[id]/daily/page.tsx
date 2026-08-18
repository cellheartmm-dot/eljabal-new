"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function WorkerDailiesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workerId = resolvedParams.id;

  const [worker, setWorker] = useState<any>(null);
  const [dailies, setDailies] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDaily, setEditingDaily] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("حاضر");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const wRes = await fetch(`/api/workers/${workerId}`);
      const wData = await wRes.json();
      if (wRes.ok) {
        setWorker(wData);
        setDailies(wData.dailyRecords || []);
        if (wData.dailyRate) setAmount(wData.dailyRate.toString());
      }

      const pRes = await fetch("/api/projects");
      const pData = await pRes.json();
      const pList = Array.isArray(pData) ? pData : pData.projects || [];
      setProjects(pList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workerId]);

  const resetForm = () => {
    setProjectId("");
    setStatus("حاضر");
    setAmount(worker?.dailyRate ? worker.dailyRate.toString() : "");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (d: any) => {
    setEditingDaily(d);
    setProjectId(d.projectId || "");
    setStatus(d.status || "حاضر");
    setAmount(d.amount?.toString() || "");
    setDate(d.date ? new Date(d.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setNotes(d.notes || "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/worker-dailies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId,
          projectId: projectId || null,
          status,
          amount,
          date,
          notes,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDaily) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/worker-dailies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDaily.id,
          projectId: projectId || null,
          status,
          amount,
          date,
          notes,
        }),
      });

      if (res.ok) {
        setEditingDaily(null);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDaily = async (dId: string, dAmount: number) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف سطر اليومية بقيمة (${formatCurrency(dAmount)})؟`)) return;

    try {
      const res = await fetch(`/api/worker-dailies?id=${dId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: "50vh" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 14 }}>جاري تحميل يوميات العامل...</div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="empty-state" style={{ minHeight: "50vh" }}>
        <div className="empty-state-icon">👷</div>
        <div className="empty-state-text">لم يتم العثور على سجل هذا العامل</div>
        <Link href="/workers" className="btn btn-primary mt-4">← العودة للعمال</Link>
      </div>
    );
  }

  const totalDailiesAmount = dailies.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div style={{ maxWidth: 950, margin: "0 auto" }}>
      {/* Action Header */}
      <div className="page-header print:hidden" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">📅 سجل يوميات العامل - {worker.name}</h1>
          <p className="page-subtitle">متابعة وتسجيل وأرشيف يوميات الحضور بالمشاريع وسعر اليومية: {formatCurrency(worker.dailyRate || 0)}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة يومية جديدة
          </button>
          <button className="btn btn-primary" style={{ background: "#059669" }} onClick={() => window.print()}>
            🖨️ طباعة تقرير اليوميات
          </button>
          <Link href="/workers" className="btn btn-ghost">
            ← العودة للعمال
          </Link>
        </div>
      </div>

      {/* Printable Statement Container */}
      <div className="card" style={{ padding: 28 }}>
        {/* Company & Report Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid hsl(var(--border-subtle))", paddingBottom: 20, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "hsl(var(--gold))" }}>الجبل الذهبي للمقاولات العامة</h2>
            <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>تقرير سجل يوميات وحضور الموقع التفصيلي</p>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>تاريخ التقرير: {new Date().toLocaleDateString("ar-EG")}</div>
            <div className="badge badge-info" style={{ marginTop: 6, fontSize: 12 }}>{worker.specialty || "عامل"}</div>
          </div>
        </div>

        {/* Worker Personal Info Grid */}
        <div className="grid-4" style={{ gap: 14, background: "hsl(var(--bg-elevated))", padding: 16, borderRadius: 10, marginBottom: 20 }}>
          <div>
            <div className="text-muted" style={{ fontSize: 11 }}>اسم العامل:</div>
            <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>{worker.name}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11 }}>المهنة / التخصص:</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{worker.specialty || "-"}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11 }}>سعر اليومية التعاقدية:</div>
            <div style={{ fontWeight: 800, color: "hsl(var(--gold))", fontSize: 14, marginTop: 2 }}>{formatCurrency(worker.dailyRate || 0)}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11 }}>رقم الهاتف / الهوية:</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{worker.phone || worker.nationalId || "-"}</div>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid-2" style={{ gap: 14, marginBottom: 24 }}>
          <div style={{ background: "#10b98115", border: "1px solid #10b98140", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>إجمالي مستحقات اليوميات المسجلة</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#10b981", marginTop: 4 }}>
              {formatCurrency(totalDailiesAmount)}
            </div>
          </div>

          <div style={{ background: "#3b82f615", border: "1px solid #3b82f640", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#3b82f6", fontWeight: 700 }}>إجمالي عدد الأيام المسجلة</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#3b82f6", marginTop: 4 }}>
              {dailies.length} يوم عمل
            </div>
          </div>
        </div>

        {/* Dailies Table */}
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>📋 سجل بيان الحضور واليوميات بالمواقع</h3>
        <div className="table-container">
          {dailies.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-state-text">لا توجد يوميات مسجلة لهذا العامل بعد</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>المشروع / الموقع</th>
                  <th>حالة الحضور</th>
                  <th>المبلغ المستحق (جنيه)</th>
                  <th>الملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 120 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {dailies.map((d, idx) => (
                  <tr key={d.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(d.date || d.createdAt)}</td>
                    <td style={{ fontWeight: 700 }}>{d.project ? d.project.name : "مشروع عام / موقع"}</td>
                    <td><span className="badge badge-success">{d.status || "حاضر"}</span></td>
                    <td style={{ fontWeight: 900, color: "#10b981" }}>{formatCurrency(d.amount || 0)}</td>
                    <td>{d.notes || "-"}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(d)}
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDeleteDaily(d.id, d.amount)}
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Signatures for Printing */}
        <div className="print-only" style={{ marginTop: 40, display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: "1px dashed #ccc" }}>
          <div>توقيع توثيق العامل: ........................</div>
          <div>توقيع المهندس/المشرف المسؤول: ........................</div>
          <div>اعتماد إدارة الشركة: ........................</div>
        </div>
      </div>

      {/* ADD DAILY MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">+ إضافة يومية جديدة للعامل ({worker.name})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">المشروع</label>
                  <select className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">-- اختر المشروع (اختياري) --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">حالة الحضور</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="حاضر">حاضر (يوم كامل)</option>
                      <option value="نصف يوم">نصف يوم</option>
                      <option value="وقت إضافي">وقت إضافي</option>
                      <option value="غائب">غائب</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">المبلغ المستحق (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">التاريخ</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ملاحظات حول طبيعة العمل والموقع..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ اليومية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DAILY MODAL */}
      {editingDaily && (
        <div className="modal-overlay" onClick={() => setEditingDaily(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ تعديل سطر اليومية</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingDaily(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">المشروع</label>
                  <select className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">-- اختر المشروع (اختياري) --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">حالة الحضور</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="حاضر">حاضر (يوم كامل)</option>
                      <option value="نصف يوم">نصف يوم</option>
                      <option value="وقت إضافي">وقت إضافي</option>
                      <option value="غائب">غائب</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">المبلغ المستحق (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">التاريخ</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingDaily(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "تحديث اليومية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
