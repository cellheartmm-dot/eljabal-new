"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

function parseSupervisorSalaryRecord(sal: any) {
  let baseSalary = sal.amount || 0;
  let bonuses = 0;
  let deductions = 0;
  let yearStr = new Date(sal.paidAt || sal.createdAt).getFullYear().toString();
  let monthStr = (new Date(sal.paidAt || sal.createdAt).getMonth() + 1).toString();
  let notesText = sal.notes || "";

  if (sal.notes && sal.notes.includes("[meta:")) {
    try {
      const match = sal.notes.match(/\[meta:base=([\d.]+)\|bonus=([\d.]+)\|deduction=([\d.]+)\|year=(\d+)\|month=(\d+)\]/);
      if (match) {
        baseSalary = parseFloat(match[1]) || 0;
        bonuses = parseFloat(match[2]) || 0;
        deductions = parseFloat(match[3]) || 0;
        yearStr = match[4];
        monthStr = match[5];
        notesText = sal.notes.replace(/\[meta:[^\]]+\]/, "").trim();
      }
    } catch (e) {
      console.error(e);
    }
  }

  const netSalary = Math.max(0, baseSalary + bonuses - deductions);

  return {
    ...sal,
    baseSalary,
    bonuses,
    deductions,
    netSalary: sal.amount !== undefined && sal.amount > 0 ? sal.amount : netSalary,
    yearStr,
    monthStr,
    cleanNotes: notesText,
  };
}

const ARABIC_MONTHS: { [key: string]: string } = {
  "1": "يناير",
  "2": "فبراير",
  "3": "مارس",
  "4": "أبريل",
  "5": "مايو",
  "6": "يونيو",
  "7": "يوليو",
  "8": "أغسطس",
  "9": "سبتمبر",
  "10": "أكتوبر",
  "11": "نوفمبر",
  "12": "ديسمبر",
};

export default function SupervisorSalariesPage() {
  const [rawSalaries, setRawSalaries] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupervisorFilter, setSelectedSupervisorFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [dateFilterType, setDateFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [supervisorId, setSupervisorId] = useState("");
  const [monthInput, setMonthInput] = useState((new Date().getMonth() + 1).toString());
  const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());
  const [baseSalaryInput, setBaseSalaryInput] = useState("");
  const [bonusesInput, setBonusesInput] = useState("0");
  const [deductionsInput, setDeductionsInput] = useState("0");
  const [paidAtInput, setPaidAtInput] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch salaries
      const sRes = await fetch("/api/supervisor-salaries");
      const sData = await sRes.json();
      if (Array.isArray(sData)) setRawSalaries(sData);

      // Fetch supervisors
      const supRes = await fetch("/api/supervisors");
      const supData = await supRes.json();
      if (Array.isArray(supData)) {
        setSupervisors(supData);
        if (supData.length > 0 && !supervisorId) {
          setSupervisorId(supData[0].id);
          setBaseSalaryInput(supData[0].salary?.toString() || "");
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

  const parsedSalaries = rawSalaries.map(parseSupervisorSalaryRecord);

  // Filtered Salaries Logic
  const filteredSalaries = parsedSalaries.filter((s) => {
    // 1. Text Search
    const search = searchTerm.toLowerCase();
    const supName = s.supervisorName || (s.supervisor ? s.supervisor.name : "");
    const notesText = s.cleanNotes || "";

    const matchSearch =
      !search ||
      supName.toLowerCase().includes(search) ||
      notesText.toLowerCase().includes(search);

    if (!matchSearch) return false;

    // 2. Supervisor Filter
    if (selectedSupervisorFilter && s.supervisorId !== selectedSupervisorFilter) {
      return false;
    }

    // 3. Month Filter
    if (monthFilter && s.monthStr !== monthFilter) {
      return false;
    }

    // 4. Year Filter
    if (yearFilter && s.yearStr !== yearFilter) {
      return false;
    }

    // 5. Custom Date Range Filter
    if (dateFilterType === "custom") {
      const recordDate = new Date(s.paidAt || s.createdAt);
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

    return true;
  });

  const totalSalariesPaidSum = filteredSalaries.reduce((sum, s) => sum + (s.netSalary || 0), 0);

  const handleSupervisorSelect = (id: string) => {
    setSupervisorId(id);
    const target = supervisors.find((sup) => sup.id === id);
    if (target?.salary) {
      setBaseSalaryInput(target.salary.toString());
    }
  };

  const resetForm = () => {
    if (supervisors.length > 0) {
      setSupervisorId(supervisors[0].id);
      setBaseSalaryInput(supervisors[0].salary?.toString() || "");
    } else {
      setSupervisorId("");
      setBaseSalaryInput("");
    }
    setMonthInput((new Date().getMonth() + 1).toString());
    setYearInput(new Date().getFullYear().toString());
    setBonusesInput("0");
    setDeductionsInput("0");
    setPaidAtInput(new Date().toISOString().split("T")[0]);
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (s: any) => {
    const parsed = parseSupervisorSalaryRecord(s);
    setEditingSalary(s);
    setSupervisorId(s.supervisorId || "");
    setMonthInput(parsed.monthStr);
    setYearInput(parsed.yearStr);
    setBaseSalaryInput(parsed.baseSalary.toString());
    setBonusesInput(parsed.bonuses.toString());
    setDeductionsInput(parsed.deductions.toString());
    setPaidAtInput(s.paidAt ? new Date(s.paidAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setNotes(parsed.cleanNotes);
  };

  const calcNetSalary = Math.max(
    0,
    (parseFloat(baseSalaryInput) || 0) + (parseFloat(bonusesInput) || 0) - (parseFloat(deductionsInput) || 0)
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorId) return;

    const targetSup = supervisors.find((sup) => sup.id === supervisorId);
    setSubmitting(true);
    try {
      const res = await fetch("/api/supervisor-salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorId,
          supervisorName: targetSup ? targetSup.name : "مشرف",
          month: monthInput,
          year: yearInput,
          baseSalary: baseSalaryInput,
          bonuses: bonusesInput,
          deductions: deductionsInput,
          amount: calcNetSalary,
          paidAt: paidAtInput,
          notes,
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
    if (!editingSalary) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/supervisor-salaries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSalary.id,
          month: monthInput,
          year: yearInput,
          baseSalary: baseSalaryInput,
          bonuses: bonusesInput,
          deductions: deductionsInput,
          amount: calcNetSalary,
          paidAt: paidAtInput,
          notes,
        }),
      });

      if (res.ok) {
        setEditingSalary(null);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSalary = async (sId: string, sAmount: number) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف سجل الراتب بقيمة (${formatCurrency(sAmount)})؟`)) return;

    try {
      const res = await fetch(`/api/supervisor-salaries?id=${sId}`, { method: "DELETE" });
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
          <h1 className="page-title">💰 رواتب المشرفين والمهندسين</h1>
          <p className="page-subtitle">تسجيل وحصر الرواتب الأساسية والمكافآت والخصومات للمشرفين شهرياً</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + تسجيل وصرف راتب جديد
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة السجل
          </button>
        </div>
      </div>

      {/* SUMMARY CARD: إجمالي الرواتب */}
      <div className="print:hidden" style={{ marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", color: "#fff", borderRadius: 16, padding: "22px 24px", maxWidth: 450 }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي الرواتب المصروفة (للحالات المعروضة):</div>
          <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalSalariesPaidSum)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع الصافي الكلي المدفوع رواتب للمشرفين</div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14 }}>
          {/* 1. Text Search Bar */}
          <div className="form-group" style={{ marginBottom: 0, flex: "2 1 220px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث نصي سريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث باسم المشرف، أو ملاحظات الصرف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 2. Supervisor Filter */}
          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 170px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>👔 فلتر المشرف</label>
            <select
              className="form-control"
              value={selectedSupervisorFilter}
              onChange={(e) => setSelectedSupervisorFilter(e.target.value)}
            >
              <option value="">-- جميع المشرفين --</option>
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Month Filter */}
          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 140px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>📅 فلتر الشهر</label>
            <select
              className="form-control"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="">جميع الشهور</option>
              {Object.entries(ARABIC_MONTHS).map(([val, nameStr]) => (
                <option key={val} value={val}>
                  {nameStr} ({val})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Year Filter */}
          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 130px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🗓️ فلتر السنة</label>
            <select
              className="form-control"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="">جميع السنوات</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {/* Custom Date Range Toggle & Inputs */}
          <div className="form-group" style={{ marginBottom: 0, flex: "0 0 auto", display: "flex", alignItems: "center" }}>
            <label style={{ fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
              <input
                type="checkbox"
                checked={dateFilterType === "custom"}
                onChange={(e) => setDateFilterType(e.target.checked ? "custom" : "all")}
              />
              فترة مخصصة
            </label>
          </div>

          {dateFilterType === "custom" && (
            <>
              <div className="form-group" style={{ marginBottom: 0, flex: "1 1 130px" }}>
                <label className="form-label" style={{ fontSize: 11 }}>من تاريخ:</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, flex: "1 1 130px" }}>
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


      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل سجلات الرواتب...</div>
            </div>
          ) : filteredSalaries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <div className="empty-state-text">
                {searchTerm || selectedSupervisorFilter || monthFilter || yearFilter || dateFilterType !== "all"
                  ? "لا توجد رواتب تطابق الفلاتر المحددة"
                  : "لا توجد رواتب مسجلة حالياً في النظام"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + تسجيل أول راتب
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>المشرف</th>
                  <th>الشهر / السنة</th>
                  <th>الأساسي</th>
                  <th>المكافآت</th>
                  <th>الخصومات</th>
                  <th>الصافي</th>
                  <th>تاريخ الدفع</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 110 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalaries.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>
                      {s.supervisorName || (s.supervisor ? s.supervisor.name : "مشرف")}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {ARABIC_MONTHS[s.monthStr] || s.monthStr} / {s.yearStr}
                    </td>
                    <td>{formatCurrency(s.baseSalary || 0)}</td>
                    <td style={{ color: "#10b981", fontWeight: 700 }}>
                      {s.bonuses > 0 ? formatCurrency(s.bonuses) : "-"}
                    </td>
                    <td style={{ color: "#ef4444", fontWeight: 700 }}>
                      {s.deductions > 0 ? formatCurrency(s.deductions) : "-"}
                    </td>
                    <td style={{ fontWeight: 900, color: "hsl(var(--gold))" }}>{formatCurrency(s.netSalary || 0)}</td>
                    <td>{formatDateShort(s.paidAt || s.createdAt)}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(s)}
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDeleteSalary(s.id, s.netSalary)}
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

      {/* ADD SALARY MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h2 className="modal-title">💵 تسجيل وصرف راتب مشرف جديد</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">المشرف *</label>
                  <select
                    className="form-control"
                    required
                    value={supervisorId}
                    onChange={(e) => handleSupervisorSelect(e.target.value)}
                  >
                    <option value="" disabled>-- اختر المشرف --</option>
                    {supervisors.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.salaryType || "شهري"}) - الراتب: {sup.salary} ج.م
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">الشهر *</label>
                    <select className="form-control" value={monthInput} onChange={(e) => setMonthInput(e.target.value)}>
                      {Object.entries(ARABIC_MONTHS).map(([val, nameStr]) => (
                        <option key={val} value={val}>
                          {nameStr} ({val})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">السنة *</label>
                    <select className="form-control" value={yearInput} onChange={(e) => setYearInput(e.target.value)}>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">الأساسي (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={baseSalaryInput}
                      onChange={(e) => setBaseSalaryInput(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المكافآت (جنيه)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={bonusesInput}
                      onChange={(e) => setBonusesInput(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الخصومات (جنيه)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={deductionsInput}
                      onChange={(e) => setDeductionsInput(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>الصافي المستحق (محسوب):</span>
                  <span style={{ fontWeight: 900, color: "#10b981", fontSize: 18 }}>{formatCurrency(calcNetSalary)}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ الدفع</label>
                  <input
                    type="date"
                    className="form-control"
                    value={paidAtInput}
                    onChange={(e) => setPaidAtInput(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ملاحظات حول أسلوب الصرف..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
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

      {/* EDIT SALARY MODAL */}
      {editingSalary && (
        <div className="modal-overlay" onClick={() => setEditingSalary(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ تعديل راتب المشرف ({editingSalary.supervisorName})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingSalary(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">الشهر *</label>
                    <select className="form-control" value={monthInput} onChange={(e) => setMonthInput(e.target.value)}>
                      {Object.entries(ARABIC_MONTHS).map(([val, nameStr]) => (
                        <option key={val} value={val}>
                          {nameStr} ({val})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">السنة *</label>
                    <select className="form-control" value={yearInput} onChange={(e) => setYearInput(e.target.value)}>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">الأساسي (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={baseSalaryInput}
                      onChange={(e) => setBaseSalaryInput(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">المكافآت (جنيه)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={bonusesInput}
                      onChange={(e) => setBonusesInput(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">الخصومات (جنيه)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={deductionsInput}
                      onChange={(e) => setDeductionsInput(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ background: "hsl(var(--bg-elevated))", padding: 12, borderRadius: 8, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>الصافي المستحق (محسوب):</span>
                  <span style={{ fontWeight: 900, color: "#10b981", fontSize: 18 }}>{formatCurrency(calcNetSalary)}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ الدفع</label>
                  <input
                    type="date"
                    className="form-control"
                    value={paidAtInput}
                    onChange={(e) => setPaidAtInput(e.target.value)}
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
                <button type="button" className="btn btn-ghost" onClick={() => setEditingSalary(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "تحديث الراتب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
