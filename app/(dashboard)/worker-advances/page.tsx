"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

function parseAdvanceRecord(a: any) {
  let deductedAmount = 0;
  let notesText = a.notes || "";

  if (a.notes && a.notes.includes("[meta:")) {
    try {
      const match = a.notes.match(/\[meta:deducted=([\d.]+)\]/);
      if (match) {
        deductedAmount = parseFloat(match[1]) || 0;
        notesText = a.notes.replace(/\[meta:[^\]]+\]/, "").trim();
      }
    } catch (e) {
      console.error(e);
    }
  }

  const advanceAmount = a.amount || 0;
  const remainingAmount = Math.max(0, advanceAmount - deductedAmount);
  const derivedStatus = remainingAmount === 0 && advanceAmount > 0 ? "مكتمل" : (a.status || "مدفوع");

  return {
    ...a,
    advanceAmount,
    deductedAmount,
    remainingAmount,
    derivedStatus,
    cleanNotes: notesText,
  };
}

export default function WorkerAdvancesPage() {
  const [rawAdvances, setRawAdvances] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState("");
  const [dateFilterType, setDateFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [workerId, setWorkerId] = useState("");
  const [amount, setAmount] = useState("");
  const [deductedAmountInput, setDeductedAmountInput] = useState("0");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("مدفوع");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const aRes = await fetch("/api/worker-advances");
      const aData = await aRes.json();
      if (Array.isArray(aData)) setRawAdvances(aData);

      const wRes = await fetch("/api/workers");
      const wData = await wRes.json();
      if (Array.isArray(wData)) {
        setWorkers(wData);
        if (wData.length > 0 && !workerId) {
          setWorkerId(wData[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const parsedAdvances = rawAdvances.map(parseAdvanceRecord);

  // Filtered Advances logic
  const filteredAdvances = parsedAdvances.filter((a) => {
    // 1. Text Search
    const search = searchTerm.toLowerCase();
    const workerName = a.worker?.name || "";
    const notesText = a.cleanNotes || "";

    const matchSearch =
      !search ||
      workerName.toLowerCase().includes(search) ||
      notesText.toLowerCase().includes(search);

    if (!matchSearch) return false;

    // 2. Worker Filter
    if (selectedWorkerFilter && a.workerId !== selectedWorkerFilter) {
      return false;
    }

    // 3. Date / Custom Date Range Filter
    if (dateFilterType !== "all") {
      const recordDate = new Date(a.date || a.createdAt);
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

  const totalAdvancesSum = filteredAdvances.reduce((sum, a) => sum + (a.advanceAmount || 0), 0);
  const totalRemainingSum = filteredAdvances.reduce((sum, a) => sum + (a.remainingAmount || 0), 0);

  const resetForm = () => {
    if (workers.length > 0) {
      setWorkerId(workers[0].id);
    } else {
      setWorkerId("");
    }
    setAmount("");
    setDeductedAmountInput("0");
    setDate(new Date().toISOString().split("T")[0]);
    setStatus("مدفوع");
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (a: any) => {
    const parsed = parseAdvanceRecord(a);
    setEditingAdvance(a);
    setWorkerId(a.workerId || "");
    setAmount(parsed.advanceAmount.toString());
    setDeductedAmountInput(parsed.deductedAmount.toString());
    setDate(a.date ? new Date(a.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setStatus(parsed.derivedStatus);
    setNotes(parsed.cleanNotes);
  };

  const parsedAmountNum = parseFloat(amount) || 0;
  const parsedDeductedNum = parseFloat(deductedAmountInput) || 0;
  const calcRemaining = Math.max(0, parsedAmountNum - parsedDeductedNum);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !amount) return;

    setSubmitting(true);
    try {
      const metaNotes = `[meta:deducted=${deductedAmountInput}] ${notes}`.trim();
      const finalStatus = calcRemaining === 0 && parsedAmountNum > 0 ? "مكتمل" : status;

      const res = await fetch("/api/worker-advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId,
          amount: parsedAmountNum,
          date,
          status: finalStatus,
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
    if (!editingAdvance || !amount) return;

    setSubmitting(true);
    try {
      const metaNotes = `[meta:deducted=${deductedAmountInput}] ${notes}`.trim();
      const finalStatus = calcRemaining === 0 && parsedAmountNum > 0 ? "مكتمل" : status;

      const res = await fetch("/api/worker-advances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAdvance.id,
          amount: parsedAmountNum,
          date,
          status: finalStatus,
          notes: metaNotes,
        }),
      });

      if (res.ok) {
        setEditingAdvance(null);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdvance = async (aId: string, aAmount: number) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف السلفة بقيمة (${formatCurrency(aAmount)})؟`)) return;

    try {
      const res = await fetch(`/api/worker-advances?id=${aId}`, { method: "DELETE" });
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
          <h1 className="page-title">💵 سلف العمال العامة</h1>
          <p className="page-subtitle">إدارة ومتابعة السلف المالية المسحوبة لجميع العمال وحصر المتبقي للخصم</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + تسجيل سلفة جديد
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
              placeholder="ابحث باسم العامل، أو ملاحظات السلفة..."
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


      {/* 2 Summary Cards (Re-calculated based on filteredAdvances) */}
      <div className="grid-2 print:hidden" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي السلف (للبحث والفلتر الحية):</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalAdvancesSum)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>المجموع الكلي لمبالغ السلف حسب نتائج الفلترة</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>المتبقي للخصم (للبحث والفلتر الحية):</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalRemainingSum)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>المبلغ المتبقي المستحق للخصم لنتائج الفلترة الحالية</div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل سلف العمال...</div>
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💵</div>
              <div className="empty-state-text">
                {searchTerm || selectedWorkerFilter || dateFilterType !== "all"
                  ? "لا توجد سلف تطابق فلاتر والبحث المحددة"
                  : "لا توجد سلف مسجلة حالياً في النظام"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + تسجيل أول سلفة
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>العامل</th>
                  <th>المبلغ</th>
                  <th>المخصوم</th>
                  <th>المتبقي</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 110 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvances.map((a, idx) => (
                  <tr key={a.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(a.date || a.createdAt)}</td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>
                      {a.worker ? a.worker.name : "عامل"}
                    </td>
                    <td className="text-danger" style={{ fontWeight: 800 }}>{formatCurrency(a.advanceAmount || 0)}</td>
                    <td style={{ color: "#10b981", fontWeight: 700 }}>
                      {a.deductedAmount > 0 ? formatCurrency(a.deductedAmount) : "-"}
                    </td>
                    <td style={{ fontWeight: 900, color: a.remainingAmount > 0 ? "#f59e0b" : "hsl(var(--text-muted))" }}>
                      {formatCurrency(a.remainingAmount || 0)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${a.derivedStatus === "مكتمل" ? "badge-success" : a.derivedStatus === "معلق" ? "badge-warning" : "badge-info"}`}>
                        {a.derivedStatus}
                      </span>
                    </td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(a)}
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDeleteAdvance(a.id, a.advanceAmount)}
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

      {/* ADD ADVANCE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">+ تسجيل سلفة مالية لعامل</h2>
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
                    onChange={(e) => setWorkerId(e.target.value)}
                  >
                    <option value="" disabled>-- اختر العامل من القائمة --</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.specialty || "عامل"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">مبلغ السلفة الإجمالي (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المبلغ المخصوم حتى الآن (جنيه)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={deductedAmountInput}
                      onChange={(e) => setDeductedAmountInput(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>المتبقي للخصم (محسوب):</span>
                  <span style={{ fontWeight: 900, color: "#f59e0b", fontSize: 15 }}>{formatCurrency(calcRemaining)}</span>
                </div>

                <div className="grid-2">
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
                    <label className="form-label">حالة السلفة</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="مدفوع">مدفوع / جاري الخصم</option>
                      <option value="معلق">معلق</option>
                      <option value="مكتمل">مكتمل الخصم</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">سبب السلفة / ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ملاحظات حول طريقة السداد..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "تسجيل السلفة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADVANCE MODAL */}
      {editingAdvance && (
        <div className="modal-overlay" onClick={() => setEditingAdvance(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ تعديل سلفة العامل ({editingAdvance.worker?.name})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingAdvance(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">مبلغ السلفة الإجمالي (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المبلغ المخصوم حتى الآن (جنيه)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={deductedAmountInput}
                      onChange={(e) => setDeductedAmountInput(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>المتبقي للخصم (محسوب):</span>
                  <span style={{ fontWeight: 900, color: "#f59e0b", fontSize: 15 }}>{formatCurrency(calcRemaining)}</span>
                </div>

                <div className="grid-2">
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
                    <label className="form-label">حالة السلفة</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="مدفوع">مدفوع / جاري الخصم</option>
                      <option value="معلق">معلق</option>
                      <option value="مكتمل">مكتمل الخصم</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">سبب السلفة / ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingAdvance(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "تحديث السلفة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
