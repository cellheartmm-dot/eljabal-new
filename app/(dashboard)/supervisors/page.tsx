"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

const LOCAL_STORAGE_KEY = "eljabal_supervisors_data";

export default function SupervisorsPage() {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pay Salary Modal state
  const [paySalarySupervisor, setPaySalarySupervisor] = useState<any>(null);
  const [salaryMonth, setSalaryMonth] = useState((new Date().getMonth() + 1).toString());
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear().toString());
  const [baseSalaryInput, setBaseSalaryInput] = useState("");
  const [bonusesInput, setBonusesInput] = useState("0");
  const [deductionsInput, setDeductionsInput] = useState("0");
  const [paidAtInput, setPaidAtInput] = useState(new Date().toISOString().split("T")[0]);
  const [salaryNotes, setSalaryNotes] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [salaryType, setSalaryType] = useState("شهري");
  const [salary, setSalary] = useState("");
  const [hireDate, setHireDate] = useState(new Date().toISOString().split("T")[0]);
  const [isActive, setIsActive] = useState(true);

  const saveToLocalStorage = (list: any[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("Failed to write to localStorage:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    let localItems: any[] = [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) localItems = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await fetch("/api/supervisors");
      const apiData = await res.json();
      if (Array.isArray(apiData)) {
        const mergedMap = new Map();
        localItems.forEach((s) => mergedMap.set(s.id || s.name, s));
        apiData.forEach((s) => mergedMap.set(s.id || s.name, s));

        const finalMerged = Array.from(mergedMap.values());
        setSupervisors(finalMerged);
        saveToLocalStorage(finalMerged);
      } else if (localItems.length > 0) {
        setSupervisors(localItems);
      }
    } catch (e) {
      console.error(e);
      if (localItems.length > 0) setSupervisors(localItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSupervisors = supervisors.filter((s) => {
    const search = searchTerm.toLowerCase();
    const supName = s.name || "";
    const supPhone = s.phone || "";
    const matchSearch =
      !search ||
      supName.toLowerCase().includes(search) ||
      supPhone.includes(search);

    if (!matchSearch) return false;

    if (statusFilter === "active" && !s.isActive) return false;
    if (statusFilter === "inactive" && s.isActive) return false;

    return true;
  });

  const resetForm = () => {
    setName("");
    setPhone("");
    setSalaryType("شهري");
    setSalary("");
    setHireDate(new Date().toISOString().split("T")[0]);
    setIsActive(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditingSupervisor(s);
    setName(s.name || "");
    setPhone(s.phone || "");
    setSalaryType(s.salaryType || "شهري");
    setSalary(s.salary?.toString() || "");
    setHireDate(s.hireDate ? new Date(s.hireDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setIsActive(s.isActive !== undefined ? s.isActive : true);
  };

  const handleOpenPaySalary = (s: any) => {
    setPaySalarySupervisor(s);
    setSalaryMonth((new Date().getMonth() + 1).toString());
    setSalaryYear(new Date().getFullYear().toString());
    setBaseSalaryInput(s.salary?.toString() || "0");
    setBonusesInput("0");
    setDeductionsInput("0");
    setPaidAtInput(new Date().toISOString().split("T")[0]);
    setSalaryNotes(`صرف راتب شهر ${new Date().getMonth() + 1}/${new Date().getFullYear()}`);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    const newSupervisorItem = {
      id: "sup-" + Date.now(),
      name,
      phone: phone || "",
      salaryType: salaryType || "شهري",
      salary: parseFloat(salary) || 0,
      totalPaid: 0,
      hireDate: hireDate || new Date().toISOString().split("T")[0],
      isActive,
      createdAt: new Date().toISOString(),
    };

    const updatedList = [newSupervisorItem, ...supervisors];
    setSupervisors(updatedList);
    saveToLocalStorage(updatedList);
    setShowModal(false);
    resetForm();

    try {
      const res = await fetch("/api/supervisors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          salaryType,
          salary,
          hireDate,
          isActive,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("API call error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupervisor || !name) return;

    setSubmitting(true);
    const updatedItem = {
      ...editingSupervisor,
      name,
      phone,
      salaryType,
      salary: parseFloat(salary) || 0,
      hireDate,
      isActive,
    };

    const updatedList = supervisors.map((s) => (s.id === editingSupervisor.id ? updatedItem : s));
    setSupervisors(updatedList);
    saveToLocalStorage(updatedList);
    setEditingSupervisor(null);
    resetForm();

    try {
      const res = await fetch("/api/supervisors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSupervisor.id,
          name,
          phone,
          salaryType,
          salary,
          hireDate,
          isActive,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("API update error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaySalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySalarySupervisor) return;

    setSubmitting(true);
    const baseNum = parseFloat(baseSalaryInput) || 0;
    const bonusNum = parseFloat(bonusesInput) || 0;
    const deductNum = parseFloat(deductionsInput) || 0;
    const netSalary = Math.max(0, baseNum + bonusNum - deductNum);

    try {
      const res = await fetch("/api/supervisor-salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisorId: paySalarySupervisor.id,
          supervisorName: paySalarySupervisor.name,
          month: salaryMonth,
          year: salaryYear,
          baseSalary: baseNum,
          bonuses: bonusNum,
          deductions: deductNum,
          amount: netSalary,
          paidAt: paidAtInput,
          notes: salaryNotes,
        }),
      });

      if (res.ok) {
        alert(`تم تسجيل وصرف راتب المشرف (${paySalarySupervisor.name}) بقيمة صافية: ${formatCurrency(netSalary)}`);
        setPaySalarySupervisor(null);
        fetchData();
      } else {
        alert("حدث خطأ أثناء حفظ الراتب");
      }
    } catch (e) {
      console.error(e);
      alert("حدث خطأ في الاتصال بالشبكة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupervisor = async (sId: string, sName: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف المشرف (${sName})؟`)) return;

    const updatedList = supervisors.filter((s) => s.id !== sId);
    setSupervisors(updatedList);
    saveToLocalStorage(updatedList);

    try {
      await fetch(`/api/supervisors?id=${sId}`, { method: "DELETE" });
    } catch (e) {
      console.error("API delete error:", e);
    }
  };

  const calcNetSalary = Math.max(
    0,
    (parseFloat(baseSalaryInput) || 0) + (parseFloat(bonusesInput) || 0) - (parseFloat(deductionsInput) || 0)
  );

  return (
    <div>
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">👔 المشرفون والمهندسون</h1>
          <p className="page-subtitle">إدارة وتعيين مهندسي ومشرفي المواقع والمشاريع ونظم الأجور وتسجيل رواتبهم</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة مشرف جديد
          </button>
          <Link href="/supervisor-salaries" className="btn btn-gold">
            💰 سجل رواتب المشرفين
          </Link>
        </div>
      </div>

      {/* SEARCH AND STATUS FILTER BAR */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0, flex: "2 1 250px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث نصي سريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث باسم المشرف، أو رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 200px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>⚡ فلتر الحالة</label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">جميع الحالات (الكل)</option>
              <option value="active">نشط فقط</option>
              <option value="inactive">متوقف فقط</option>
            </select>
          </div>
        </div>
      </div>


      <div className="card">
        <div className="table-container">
          {loading && supervisors.length === 0 ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل بيانات المشرفين...</div>
            </div>
          ) : filteredSupervisors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👔</div>
              <div className="empty-state-text">
                {searchTerm || statusFilter !== "all"
                  ? "لا يوجد مشرفون يطابقون فلاتر والبحث المحددة"
                  : "لا يوجد مشرفون مسجلون حالياً"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + إضافة أول مشرف
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>نظام الراتب</th>
                  <th>الراتب الشهري/اليومية</th>
                  <th>إجمالي المدفوع</th>
                  <th>تاريخ التعيين</th>
                  <th style={{ textAlign: "center" }}>الحالة</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 170 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupervisors.map((s, idx) => (
                  <tr key={s.id || idx}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{s.name}</td>
                    <td>{s.phone || "-"}</td>
                    <td><span className="badge badge-info">{s.salaryType || "شهري"}</span></td>
                    <td className="text-gold" style={{ fontWeight: 800 }}>{formatCurrency(s.salary || 0)}</td>
                    <td style={{ fontWeight: 900, color: "#10b981" }}>{formatCurrency(s.totalPaid || 0)}</td>
                    <td>{formatDateShort(s.hireDate || s.createdAt)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${s.isActive ? "badge-success" : "badge-danger"}`}>
                        {s.isActive ? "نشط" : "متوقف"}
                      </span>
                    </td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 11, background: "#10b98115", color: "#10b981", border: "1px solid #10b98140" }}
                          onClick={() => handleOpenPaySalary(s)}
                          title="تسجيل وصرف راتب للمشرف"
                        >
                          💵 تسجيل راتب
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(s)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDeleteSupervisor(s.id, s.name)}
                        >
                          🗑️
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

      {/* PAY SALARY MODAL */}
      {paySalarySupervisor && (
        <div className="modal-overlay" onClick={() => setPaySalarySupervisor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 className="modal-title">💵 تسجيل وصرف راتب للمشرف ({paySalarySupervisor.name})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setPaySalarySupervisor(null)}>✕</button>
            </div>
            <form onSubmit={handlePaySalarySubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">عن شهر *</label>
                    <select className="form-control" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)}>
                      <option value="1">يناير (1)</option>
                      <option value="2">فبراير (2)</option>
                      <option value="3">مارس (3)</option>
                      <option value="4">أبريل (4)</option>
                      <option value="5">مايو (5)</option>
                      <option value="6">يونيو (6)</option>
                      <option value="7">يوليو (7)</option>
                      <option value="8">أغسطس (8)</option>
                      <option value="9">سبتمبر (9)</option>
                      <option value="10">أكتوبر (10)</option>
                      <option value="11">نوفمبر (11)</option>
                      <option value="12">ديسمبر (12)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">عن سنة *</label>
                    <select className="form-control" value={salaryYear} onChange={(e) => setSalaryYear(e.target.value)}>
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
                  <span className="text-muted" style={{ fontSize: 12 }}>الصافي المستحق (محسوب آلياً):</span>
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
                  <label className="form-label">ملاحظات الصرف</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ملاحظات حول طريقة الصرف أو شيك..."
                    value={salaryNotes}
                    onChange={(e) => setSalaryNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setPaySalarySupervisor(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "تأكيد وصرف الراتب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SUPERVISOR MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">+ إضافة مشرف موقع جديد</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="أدخل الاسم بالكامل"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="01xxxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">نظام الراتب *</label>
                    <select className="form-control" value={salaryType} onChange={(e) => setSalaryType(e.target.value)}>
                      <option value="شهري">شهري</option>
                      <option value="يومي">يومي</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      {salaryType === "يومي" ? "الراتب اليومي (جنيه)" : "الراتب الشهري (جنيه)"}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ التعيين</label>
                    <input
                      type="date"
                      className="form-control"
                      value={hireDate}
                      onChange={(e) => setHireDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الحالة</label>
                  <select
                    className="form-control"
                    value={isActive ? "true" : "false"}
                    onChange={(e) => setIsActive(e.target.value === "true")}
                  >
                    <option value="true">نشط</option>
                    <option value="false">متوقف</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ المشرف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUPERVISOR MODAL */}
      {editingSupervisor && (
        <div className="modal-overlay" onClick={() => setEditingSupervisor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ تعديل بيانات المشرف ({editingSupervisor.name})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingSupervisor(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الاسم بالكامل *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">رقم الهاتف</label>
                    <input
                      type="text"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">نظام الراتب *</label>
                    <select className="form-control" value={salaryType} onChange={(e) => setSalaryType(e.target.value)}>
                      <option value="شهري">شهري</option>
                      <option value="يومي">يومي</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      {salaryType === "يومي" ? "الراتب اليومي (جنيه)" : "الراتب الشهري (جنيه)"}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">تاريخ التعيين</label>
                    <input
                      type="date"
                      className="form-control"
                      value={hireDate}
                      onChange={(e) => setHireDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الحالة</label>
                  <select
                    className="form-control"
                    value={isActive ? "true" : "false"}
                    onChange={(e) => setIsActive(e.target.value === "true")}
                  >
                    <option value="true">نشط</option>
                    <option value="false">متوقف</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingSupervisor(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "تحديث المشرف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
