"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { formatCurrency, formatDateShort } from "@/lib/utils";

export default function WorkerAdvancesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workerId = resolvedParams.id;

  const [worker, setWorker] = useState<any>(null);
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("مدفوع");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workers/${workerId}`);
      const data = await res.json();
      if (res.ok) {
        setWorker(data);
        setAdvances(data.advances || []);
      }
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
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setStatus("مدفوع");
    setNotes("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (a: any) => {
    setEditingAdvance(a);
    setAmount(a.amount?.toString() || "");
    setDate(a.date ? new Date(a.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setStatus(a.status || "مدفوع");
    setNotes(a.notes || "");
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/worker-advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId,
          amount,
          date,
          status,
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
    if (!editingAdvance || !amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/worker-advances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAdvance.id,
          amount,
          date,
          status,
          notes,
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

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: "50vh" }}>
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <div className="empty-state-text" style={{ marginTop: 14 }}>جاري تحميل السلف...</div>
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

  const totalAdvancesAmount = advances.reduce((sum, a) => sum + (a.amount || 0), 0);

  return (
    <div style={{ maxWidth: 950, margin: "0 auto" }}>
      {/* Action Header */}
      <div className="page-header print:hidden" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">💵 سجل سلف العامل - {worker.name}</h1>
          <p className="page-subtitle">تسجيل وتخصيص السلف المالية المسحوبة من أجر العامل وأرشفتها بالتاريخ والسبب</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + تسجيل سلفة جديدة
          </button>
          <button className="btn btn-primary" style={{ background: "#059669" }} onClick={() => window.print()}>
            🖨️ طباعة تقرير السلف
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
            <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>تقرير سجل السلف المالية والمسحوبات النقدية</p>
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
            <div className="text-muted" style={{ fontSize: 11 }}>سعر اليومية:</div>
            <div style={{ fontWeight: 800, color: "hsl(var(--gold))", fontSize: 14, marginTop: 2 }}>{formatCurrency(worker.dailyRate || 0)}</div>
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11 }}>رقم الهاتف / الهوية:</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>{worker.phone || worker.nationalId || "-"}</div>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid-2" style={{ gap: 14, marginBottom: 24 }}>
          <div style={{ background: "#ef444415", border: "1px solid #ef444440", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>إجمالي السلف المسحوبة</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ef4444", marginTop: 4 }}>
              {formatCurrency(totalAdvancesAmount)}
            </div>
          </div>

          <div style={{ background: "#f59e0b15", border: "1px solid #f59e0b40", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#d97706", fontWeight: 700 }}>إجمالي عدد السلف</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#d97706", marginTop: 4 }}>
              {advances.length} سلفة
            </div>
          </div>
        </div>

        {/* Advances Table */}
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>📋 سجل بيانات السلف المسحوبة والمسددة</h3>
        <div className="table-container">
          {advances.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-state-text">لا توجد سلف مسجلة لهذا العامل حالياً</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45, textAlign: "center" }}>#</th>
                  <th>تاريخ السداد / السحب</th>
                  <th>مبلغ السلفة (جنيه)</th>
                  <th>الحالة</th>
                  <th>السبب / ملاحظات</th>
                  <th className="print:hidden" style={{ textAlign: "center", width: 120 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((a, idx) => (
                  <tr key={a.id}>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td>{formatDateShort(a.date || a.createdAt)}</td>
                    <td style={{ fontWeight: 900, color: "#ef4444" }}>{formatCurrency(a.amount || 0)}</td>
                    <td><span className="badge badge-success">{a.status || "مدفوع"}</span></td>
                    <td>{a.notes || "سلفة شخصية"}</td>
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
                          onClick={() => handleDeleteAdvance(a.id, a.amount)}
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
          <div>توقيع استلام العامل: ........................</div>
          <div>توقيع المحاسب المسؤول: ........................</div>
          <div>اعتماد إدارة الشركة: ........................</div>
        </div>
      </div>

      {/* ADD ADVANCE MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">+ تسجيل سلفة جديدة للعامل ({worker.name})</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">مبلغ السلفة (جنيه) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
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
                      <option value="مدفوع">مدفوع (تم الصرف)</option>
                      <option value="معلق">معلق</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">سبب السلفة / ملاحظات</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: سلفة شخصية تسدد من مستحقات الشهر..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>إلغاء</button>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ تعديل سطر السلفة</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingAdvance(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">مبلغ السلفة (جنيه) *</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
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
                      <option value="مدفوع">مدفوع (تم الصرف)</option>
                      <option value="معلق">معلق</option>
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
