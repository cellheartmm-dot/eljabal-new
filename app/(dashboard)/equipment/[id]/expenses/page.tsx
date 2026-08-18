"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function DedicatedEquipmentExpensesPage() {
  const params = useParams();
  const equipId = params?.id as string;

  const [equipment, setEquipment] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [type, setType] = useState("سولار ووقود");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    if (!equipId) return;
    setLoading(true);
    try {
      // 1. Fetch Equipment details
      const eqRes = await fetch("/api/equipment");
      const eqData = await eqRes.json();
      const eqList = Array.isArray(eqData) ? eqData : eqData?.equipment || [];
      const found = eqList.find((eq: any) => eq.id === equipId);
      if (found) setEquipment(found);

      // 2. Fetch Expenses for this equipment
      const exRes = await fetch(`/api/equipment-expenses?equipmentId=${equipId}`);
      const exData = await exRes.json();
      if (Array.isArray(exData)) setExpenses(exData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [equipId]);

  const resetForm = () => {
    setType("سولار ووقود");
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (ex: any) => {
    setEditingExpense(ex);
    setType(ex.type || "سولار ووقود");
    setAmount(ex.amount?.toString() || "");
    setDescription(ex.description || "");
    setDate(ex.date ? new Date(ex.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setNotes(ex.notes || "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/equipment-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId: equipId,
          equipmentName: equipment ? equipment.name : "معدة",
          type,
          description: description || `مصروف ${type}`,
          amount,
          date,
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
    if (!editingExpense || !amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/equipment-expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExpense.id,
          type,
          description: description || editingExpense.description,
          amount,
          date,
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

  const handleDeleteExpense = async (exId: string, exAmount: number) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف المصروف بقيمة (${formatCurrency(exAmount)})؟`)) return;

    try {
      const res = await fetch(`/api/equipment-expenses?id=${exId}`, { method: "DELETE" });
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
    const matchSearch =
      !search ||
      ex.description?.toLowerCase().includes(search) ||
      ex.notes?.toLowerCase().includes(search) ||
      ex.type?.toLowerCase().includes(search);

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
          <h1 className="page-title">💰 مصروفات وتكاليف المعدة: {equipment?.name || "المعدة"}</h1>
          <p className="page-subtitle">
            الكود: <strong>{equipment?.code || "EQ-001"}</strong> | الحالة التشغيلية: <span className="badge badge-success">{equipment?.status || "يعمل"}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + تسجيل مصروف جديد
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            🖨️ طباعة التقرير
          </button>
          <Link href="/equipment" className="btn btn-ghost">
            ← العودة للمعدات
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid-3 print:hidden" style={{ gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>إجمالي المصروفات التراكمية:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{formatCurrency(totalExpenseVal)}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>مجموع تكاليف الوقود والصيانة وقطع الغيار</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>عدد عمليات المصروفات:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{filteredExpenses.length}</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>إجمالي عمليات الصرف المسجلة للمعدة</div>
        </div>

        <div style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#fff", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>متوسط التكلفة للعملية:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>
            {formatCurrency(filteredExpenses.length > 0 ? totalExpenseVal / filteredExpenses.length : 0)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>متوسط قيمة عملية الصرف الفردية</div>
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
              placeholder="ابحث بالبيان، الملاحظات، أو نوع المصروف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <label className="form-label" style={{ fontSize: 12 }}>🔧 نوع المصروف</label>
            <select
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">جميع أنواع المصروفات</option>
              <option value="سولار ووقود">سولار ووقود</option>
              <option value="صيانة وقطع غيار">صيانة وقطع غيار</option>
              <option value="تغيير زيوت وفلاتر">تغيير زيوت وفلاتر</option>
              <option value="إيجار معدة خارجية">إيجار معدة خارجية</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
        </div>
      </div>

      {/* EXPENSES TABLE */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" style={{ width: 30, height: 30 }} />
              <div className="empty-state-text" style={{ marginTop: 12 }}>جاري تحميل مصروفات المعدة...</div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <div className="empty-state-text">
                {searchTerm || typeFilter ? "لا توجد مصروفات تتماشى مع البحث والفلترة" : "لم يتم تسجيل أي مصروفات لهذه المعدة بعد"}
              </div>
              <button className="btn btn-primary btn-sm print:hidden" style={{ marginTop: 12 }} onClick={handleOpenAdd}>
                + تسجيل أول مصروف
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: "center" }}>#</th>
                  <th>تاريخ المصروف</th>
                  <th>نوع المصروف</th>
                  <th>البيان / الوصف</th>
                  <th>المبلغ المستقطع</th>
                  <th>الملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 110 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((ex, idx) => (
                  <tr key={ex.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(ex.date)}</td>
                    <td><span className="badge badge-warning">{ex.type}</span></td>
                    <td style={{ fontWeight: 700, color: "hsl(var(--text-primary))" }}>{ex.description}</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(ex.amount)}</td>
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
                          onClick={() => handleDeleteExpense(ex.id, ex.amount)}
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

      {/* ADD / EDIT EXPENSE MODAL */}
      {(showModal || editingExpense) && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingExpense(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingExpense ? "✏️ تعديل مصروف المعدة" : `💰 تسجيل مصروف جديد للمعدة (${equipment?.name || "المعدة"})`}
              </h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setShowModal(false); setEditingExpense(null); }}>✕</button>
            </div>
            <form onSubmit={editingExpense ? handleEditSubmit : handleAddSubmit}>
              <div className="modal-body">
                <div className="grid-2" style={{ gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">نوع المصروف *</label>
                    <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="سولار ووقود">سولار ووقود</option>
                      <option value="صيانة وقطع غيار">صيانة وقطع غيار</option>
                      <option value="تغيير زيوت وفلاتر">تغيير زيوت وفلاتر</option>
                      <option value="إيجار معدة خارجية">إيجار معدة خارجية</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">المبلغ (جنيه) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">تاريخ المصروف *</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">البيان / الشرح التفصيلي</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: شحنة سولار 300 لتر..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ملاحظات إضافية</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="رقم الفاتورة أو اسم المورد..."
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
