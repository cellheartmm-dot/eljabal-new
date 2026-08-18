"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

function parseDailyRecord(d: any) {
  const workerRate = d.worker?.dailyRate || 0;
  let daysCount = 1;
  let advanceDeduction = 0;
  let notesText = d.notes || "";

  if (d.notes && d.notes.includes("[meta:")) {
    try {
      const match = d.notes.match(/\[meta:days=([\d.]+)\|deduction=([\d.]+)\]/);
      if (match) {
        daysCount = parseFloat(match[1]) || 1;
        advanceDeduction = parseFloat(match[2]) || 0;
        notesText = d.notes.replace(/\[meta:[^\]]+\]/, "").trim();
      }
    } catch (e) {
      console.error(e);
    }
  } else if (d.status === "نصف يوم") {
    daysCount = 0.5;
  }

  const dailyRate = workerRate > 0 ? workerRate : (d.amount && daysCount > 0 ? d.amount / daysCount : 0);
  const totalAmount = daysCount * dailyRate;
  const netAmount = Math.max(0, totalAmount - advanceDeduction);

  return {
    ...d,
    daysCount,
    dailyRate,
    totalAmount,
    advanceDeduction,
    netAmount: d.amount !== undefined && d.amount > 0 ? d.amount : netAmount,
    cleanNotes: notesText,
  };
}

export default function WorkerDailyPage() {
  const [rawDailies, setRawDailies] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState("");
  const [dateFilterType, setDateFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDaily, setEditingDaily] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [workerId, setWorkerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("حاضر");
  const [daysCount, setDaysCount] = useState("1");
  const [dailyRate, setDailyRate] = useState("");
  const [advanceDeduction, setAdvanceDeduction] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const dRes = await fetch("/api/worker-dailies");
      const dData = await dRes.json();
      if (Array.isArray(dData)) setRawDailies(dData);

      const wRes = await fetch("/api/workers");
      const wData = await wRes.json();
      if (Array.isArray(wData)) {
        setWorkers(wData);
        if (wData.length > 0 && !workerId) {
          setWorkerId(wData[0].id);
          setDailyRate(wData[0].dailyRate?.toString() || "");
        }
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
  }, []);

  const parsedDailies = rawDailies.map(parseDailyRecord);

  // Filtered Dailies logic
  const filteredDailies = parsedDailies.filter((d) => {
    // 1. Text Search
    const search = searchTerm.toLowerCase();
    const workerName = d.worker?.name || "";
    const projectName = d.project?.name || "";
    const notesText = d.cleanNotes || "";

    const matchSearch =
      !search ||
      workerName.toLowerCase().includes(search) ||
      projectName.toLowerCase().includes(search) ||
      notesText.toLowerCase().includes(search);

    if (!matchSearch) return false;

    // 2. Worker Filter
    if (selectedWorkerFilter && d.workerId !== selectedWorkerFilter) {
      return false;
    }

    // 3. Date / Custom Date Range Filter
    if (dateFilterType !== "all") {
      const recordDate = new Date(d.date || d.createdAt);
      const today = new Date();

      if (dateFilterType === "today") {
        const isToday =
          recordDate.getDate() === today.getDate() &&
          recordDate.getMonth() === today.getMonth() &&
          recordDate.getFullYear() === today.getFullYear();
        if (!isToday) return false;
      } else if (dateFilterType === "week") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        if (recordDate < sevenDaysAgo) return false;
      } else if (dateFilterType === "month") {
        const isThisMonth =
          recordDate.getMonth() === today.getMonth() &&
          recordDate.getFullYear() === today.getFullYear();
        if (!isThisMonth) return false;
      } else if (dateFilterType === "custom") {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (recordDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (recordDate > end) return false;
        }
      }
    }

    return true;
  });

  const totalGrossDailies = filteredDailies.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalNetPaid = filteredDailies.reduce((sum, d) => sum + (d.netAmount || 0), 0);

  const handleWorkerSelect = (id: string) => {
    setWorkerId(id);
    const target = workers.find((w) => w.id === id);
    if (target?.dailyRate) {
      setDailyRate(target.dailyRate.toString());
    }
  };

  const resetForm = () => {
    if (workers.length > 0) {
      setWorkerId(workers[0].id);
      setDailyRate(workers[0].dailyRate?.toString() || "");
    } else {
      setWorkerId("");
      setDailyRate("");
    }
    setProjectId("");
    setStatus("حاضر");
    setDaysCount("1");
    setAdvanceDeduction("0");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (d: any) => {
    const parsed = parseDailyRecord(d);
    setEditingDaily(d);
    setWorkerId(d.workerId || "");
    setProjectId(d.projectId || "");
    setStatus(d.status || "حاضر");
    setDaysCount(parsed.daysCount.toString());
    setDailyRate(parsed.dailyRate.toString());
    setAdvanceDeduction(parsed.advanceDeduction.toString());
    setDate(d.date ? new Date(d.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setNotes(parsed.cleanNotes);
  };

  const calcTotal = (parseFloat(daysCount) || 0) * (parseFloat(dailyRate) || 0);
  const calcNet = Math.max(0, calcTotal - (parseFloat(advanceDeduction) || 0));

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) return;

    setSubmitting(true);
    try {
      const metaNotes = `[meta:days=${daysCount}|deduction=${advanceDeduction}] ${notes}`.trim();
      const res = await fetch("/api/worker-dailies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId,
          projectId: projectId || null,
          status,
          amount: calcNet,
          date,
          notes: metaNotes,
        }),
      });

      if (res.ok) {
        setShowModal(false);
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
      const metaNotes = `[meta:days=${daysCount}|deduction=${advanceDeduction}] ${notes}`.trim();
      const res = await fetch("/api/worker-dailies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDaily.id,
          projectId: projectId || null,
          status,
          amount: calcNet,
          date,
          notes: metaNotes,
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
    if (!confirm(`هل أنت تأكد من رغبتك في حذف يومية العامل بقيمة (${formatCurrency(dAmount)})؟`)) return;

    try {
      const res = await fetch(`/api/worker-dailies?id=${dId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📅 يوميات العمال العامة</h1>
          <p className="page-subtitle">سجل كامل للحضور واليوميات لجميع عمال الشركة والمواقع</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + تسجيل يومية جديد
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة السجل
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14 }}>
          {/* 1. Text Search Bar */}
          <div className="form-group" style={{ marginBottom: 0, flex: "2 1 250px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث نصي سريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث باسم العامل، المشروع، أو الملاحظات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 2. Worker Filter */}
          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>👷 فلتر العامل</label>
            <select
              className="form-control"
              value={selectedWorkerFilter}
              onChange={(e) => setSelectedWorkerFilter(e.target.value)}
            >
              <option value="">-- جميع العمال --</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.specialty || "عامل"})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Date Filter Select */}
          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>📅 فلتر الفترة الزمنية</label>
            <select
              className="form-control"
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
            >
              <option value="all">جميع التواريخ</option>
              <option value="today">اليوم</option>
              <option value="week">آخر 7 أيام (هذا الأسبوع)</option>
              <option value="month">هذا الشهر</option>
              <option value="custom">📅 فترة مخصصة...</option>
            </select>
          </div>

          {/* Custom Date Range Inputs inline */}
          {dateFilterType === "custom" && (
            <>
              <div className="form-group" style={{ marginBottom: 0, flex: "1 1 140px" }}>
                <label className="form-label" style={{ fontSize: 11 }}>من تاريخ:</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, flex: "1 1 140px" }}>
                <label className="form-label" style={{ fontSize: 11 }}>إلى تاريخ:</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>


      {/* 2 Summary Cards (Re-calculated based on filteredDailies) */}
      <div className="grid-2 print:hidden" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي اليوميات (للبحث والفلتر الحية):</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalGrossDailies)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>المجموع الكلي لقيمة الأيام المسجلة حسب نتائج الفلترة</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>صافي المدفوع (للبحث والفلتر الحية):</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalNetPaid)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>صافي المستحق النهائي بعد خصم السلف لنتائج الفلترة</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل يوميات العمال...</div>
            </div>
          ) : filteredDailies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-text">
                {searchTerm || selectedWorkerFilter || dateFilterType !== "all"
                  ? "لا توجد يوميات تطابق فلاتر والبحث المحددة"
                  : "لا توجد يوميات مسجلة حالياً في النظام"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + تسجيل أول يومية
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>العامل</th>
                  <th>المشروع</th>
                  <th>الأيام</th>
                  <th>سعر اليوم</th>
                  <th>الإجمالي</th>
                  <th>خصم سلفة</th>
                  <th>الصافي</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 110 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDailies.map((d, idx) => (
                  <tr key={d.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(d.date || d.createdAt)}</td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>
                      {d.worker ? d.worker.name : "عامل"}
                    </td>
                    <td>{d.project ? d.project.name : "مشروع عام"}</td>
                    <td style={{ fontWeight: 700 }}><span className="badge badge-info">{d.daysCount} يوم</span></td>
                    <td>{formatCurrency(d.dailyRate || 0)}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(d.totalAmount || 0)}</td>
                    <td style={{ color: "#ef4444", fontWeight: 700 }}>
                      {d.advanceDeduction > 0 ? formatCurrency(d.advanceDeduction) : "-"}
                    </td>
                    <td style={{ fontWeight: 900, color: "#10b981" }}>{formatCurrency(d.netAmount || 0)}</td>
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
                          onClick={() => handleDeleteDaily(d.id, d.netAmount)}
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
      </div>

      {/* ADD DAILY MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h2 className="modal-title">+ تسجيل يومية عامل جديدة</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اختر العامل *</label>
                  <select
                    className="form-control"
                    required
                    value={workerId}
                    onChange={(e) => handleWorkerSelect(e.target.value)}
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.specialty || "عامل"}) - اليومية: {w.dailyRate} ج.م
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">المشروع</label>
                  <select className="form-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">-- اختر المشروع (اختياري) --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">الأيام *</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      required
                      value={daysCount}
                      onChange={(e) => setDaysCount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">سعر اليوم (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">خصم سلفة (جنيه)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={advanceDeduction}
                      onChange={(e) => setAdvanceDeduction(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <div>
                    <span className="text-muted" style={{ fontSize: 11 }}>الإجمالي (محسوب):</span>
                    <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>{formatCurrency(calcTotal)}</div>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: 11 }}>الصافي المستحق:</span>
                    <div style={{ fontWeight: 900, color: "#10b981", fontSize: 15, marginTop: 2 }}>{formatCurrency(calcNet)}</div>
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
                    placeholder="ملاحظات إضافية حول اليومية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ تعديل يومية العامل ({editingDaily.worker?.name})</h2>
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

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">الأيام *</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      required
                      value={daysCount}
                      onChange={(e) => setDaysCount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">سعر اليوم (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">خصم سلفة (جنيه)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={advanceDeduction}
                      onChange={(e) => setAdvanceDeduction(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid-2" style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <div>
                    <span className="text-muted" style={{ fontSize: 11 }}>الإجمالي (محسوب):</span>
                    <div style={{ fontWeight: 800, fontSize: 15, marginTop: 2 }}>{formatCurrency(calcTotal)}</div>
                  </div>
                  <div>
                    <span className="text-muted" style={{ fontSize: 11 }}>الصافي المستحق:</span>
                    <div style={{ fontWeight: 900, color: "#10b981", fontSize: 15, marginTop: 2 }}>{formatCurrency(calcNet)}</div>
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
