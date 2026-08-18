"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function GeneralExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields matching explicit user prompt:
  // التاريخ (07/28/2026)
  // نوع المصروف * - اختر
  // البيان
  // القيمة *
  // طريقة الدفع - نقدى او شيك
  // ملاحظات
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/general-expenses");
      const data = await res.json();
      if (Array.isArray(data)) setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setType("");
    setDescription("");
    setAmount("");
    setPaymentMethod("نقدي");
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (ex: any) => {
    setEditingExpense(ex);
    setDate(ex.date ? new Date(ex.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setType(ex.type || "إيجارات ومرافق");
    setDescription(ex.description || "");
    setAmount(ex.amount?.toString() || "");
    setPaymentMethod(ex.paymentMethod || "نقدي");
    setNotes(ex.notes || "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/general-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          type,
          description: description || `مصروف ${type}`,
          amount,
          paymentMethod,
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
    if (!editingExpense || !type || !amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/general-expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExpense.id,
          date,
          type,
          description: description || editingExpense.description,
          amount,
          paymentMethod,
          notes,
        }),
      });

      if (res.ok) {
        setEditingExpense(null);
        resetForm();
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exId: string, exAmount: number) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف المصروف العام بقيمة (${formatCurrency(exAmount)})؟`)) return;

    try {
      const res = await fetch(`/api/general-expenses?id=${exId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered List
  const filteredExpenses = expenses.filter((ex) => {
    const search = searchTerm.toLowerCase();
    const typeVal = ex.type || "";
    const desc = ex.description || "";
    const notesVal = ex.notes || "";

    const matchSearch =
      !search ||
      typeVal.toLowerCase().includes(search) ||
      desc.toLowerCase().includes(search) ||
      notesVal.toLowerCase().includes(search);

    if (!matchSearch) return false;
    if (typeFilter && ex.type !== typeFilter) return false;

    return true;
  });

  const totalExpenseVal = filteredExpenses.reduce((sum, ex) => sum + (ex.amount || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header print:hidden">
        <div>
          <h1 className="page-title">📉 المصروفات العامة والإدارية</h1>
          <p className="page-subtitle">تسجيل وتتبع الإيجارات والمرافق والرواتب والمصروفات الإدارية للشركة</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + إضافة مصروف عام
          </button>
          <Link href="/general-expenses/create" className="btn btn-gold">
            📝 صفحة إدخال مصروف
          </Link>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid-3 print:hidden" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي المصروفات العامة:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalExpenseVal)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع المصاريف الإدارية والتشغيلية العامة</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>عدد عمليات الصرف:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{filteredExpenses.length}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>إجمالي التكاليف المسجلة بالنظام</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>متوسط تكلفة المصروف:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>
            {formatCurrency(filteredExpenses.length > 0 ? totalExpenseVal / filteredExpenses.length : 0)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>متوسط التكلفة لكل عملية صرف مسجلة</div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR (Side-by-Side Row) */}
      <div className="card print:hidden" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0, flex: "2 1 230px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔍 بحث نصي سريع</label>
            <input
              type="text"
              className="form-control"
              placeholder="ابحث بالبيان، نوع المصروف، أو الملاحظات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>📉 فلتر نوع المصروف</label>
            <select
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">جميع أنواع المصروفات</option>
              <option value="إيجارات ومرافق">إيجارات ومرافق (كهرباء/مياه)</option>
              <option value="رواتب وأجور إدارية">رواتب وأجور إدارية</option>
              <option value="صيانة ومهمات مكتبية">صيانة ومهمات مكتبية</option>
              <option value="نثريات وضيافة">نثريات وضيافة</option>
              <option value="رسوم وتراخيص حكومية">رسوم وتراخيص حكومية</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل المصروفات العامة...</div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📉</div>
              <div className="empty-state-text">
                {searchTerm || typeFilter ? "لا توجد مصروفات تتماشى مع فلاتر البحث" : "لا توجد مصروفات عامة مسجلة حالياً"}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + تسجيل أول مصروف عام
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>التاريخ</th>
                  <th>نوع المصروف</th>
                  <th>البيان والشرح</th>
                  <th>القيمة المستقطعة</th>
                  <th>طريقة الدفع</th>
                  <th>الملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 110 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((ex, idx) => (
                  <tr key={ex.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(ex.date)}</td>
                    <td><span className="badge badge-info">{ex.type}</span></td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{ex.description}</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(ex.amount)}</td>
                    <td><span className="badge badge-success">{ex.paymentMethod || "نقدي"}</span></td>
                    <td>{ex.notes || "-"}</td>
                    <td className="print:hidden" style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-subtle))" }}
                          onClick={() => handleOpenEdit(ex)}
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ padding: "4px 8px", fontSize: 12, background: "#ef444415", color: "#ef4444", border: "1px solid #ef444440" }}
                          onClick={() => handleDelete(ex.id, ex.amount)}
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

      {/* ADD / EDIT GENERAL EXPENSE MODAL */}
      {(showModal || editingExpense) && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingExpense(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingExpense ? "✏️ تعديل المصروف العام" : "📉 تسجيل مصروف عام وإداري جديد"}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowModal(false); setEditingExpense(null); }}>✕</button>
            </div>
            <form onSubmit={editingExpense ? handleEditSubmit : handleAddSubmit}>
              <div className="modal-body">
                {/* 1. التاريخ */}
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

                {/* 2. نوع المصروف * + 5. طريقة الدفع */}
                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">نوع المصروف *</label>
                    <select
                      className="form-control"
                      required
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="" disabled>اختر نوع المصروف</option>
                      <option value="إيجارات ومرافق">إيجارات ومرافق (كهرباء/مياه)</option>
                      <option value="رواتب وأجور إدارية">رواتب وأجور إدارية</option>
                      <option value="صيانة ومهمات مكتبية">صيانة ومهمات مكتبية</option>
                      <option value="نثريات وضيافة">نثريات وضيافة</option>
                      <option value="رسوم وتراخيص حكومية">رسوم وتراخيص حكومية</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">طريقة الدفع</label>
                    <select
                      className="form-control"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="نقدي">نقدي</option>
                      <option value="شيك بنكي">شيك بنكي</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                      <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                    </select>
                  </div>
                </div>

                {/* 3. البيان */}
                <div className="form-group">
                  <label className="form-label">البيان</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="شرح وتفاصيل المصروف..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* 4. القيمة * */}
                <div className="form-group">
                  <label className="form-label">القيمة (جنيه) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                {/* 6. ملاحظات */}
                <div className="form-group">
                  <label className="form-label">ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="أي ملاحظات أو رقم الفاتورة..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowModal(false); setEditingExpense(null); }}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : "حفظ المصروف والتأكيد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
